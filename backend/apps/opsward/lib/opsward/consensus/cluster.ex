defmodule OpsWard.Consensus.Cluster do
  use GenServer
  require Logger

  @retry_interval 1_000

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  def commit(command), do: GenServer.call(__MODULE__, {:commit, command}, 10_000)
  def status, do: GenServer.call(__MODULE__, :status)

  @impl true
  def init(_state) do
    config = Application.fetch_env!(:opsward, :raft)
    Application.put_env(:ra, :data_dir, normalize_data_dir(config[:data_dir]))
    :ok = normalize_start(:ra_system.start_default())

    nodes = Enum.uniq([node() | config[:nodes] || []])
    members = Enum.map(nodes, &{config[:cluster_name], &1})
    configured_nodes = config[:nodes] || []

    state = %{
      bootstrap_node: List.first(configured_nodes) || node(),
      cluster_name: config[:cluster_name],
      last_error: nil,
      local: {config[:cluster_name], node()},
      members: members,
      nodes: nodes,
      ready: false,
      system: config[:system]
    }

    send(self(), :bootstrap)
    {:ok, state}
  end

  @impl true
  def handle_info(:bootstrap, state) do
    state = connect_and_bootstrap(state)

    unless state.ready do
      Process.send_after(self(), :bootstrap, @retry_interval)
    end

    {:noreply, state}
  end

  @impl true
  def handle_call({:commit, _command}, _from, %{ready: false} = state) do
    {:reply, {:error, :consensus_unavailable}, state}
  end

  def handle_call({:commit, command}, _from, state) do
    reply = :ra.process_command(state.local, command, 8_000)
    {:reply, normalize_reply(reply), state}
  end

  def handle_call(:status, _from, %{ready: false} = state) do
    status = %{
      mode: :raft,
      node: to_string(node()),
      state: :initializing,
      error: inspect(state.last_error)
    }

    {:reply, status, state}
  end

  def handle_call(:status, _from, state) do
    members =
      case :ra.members(state.local) do
        {:ok, member_ids, leader} ->
          %{members: Enum.map(member_ids, &inspect/1), leader: inspect(leader)}

        other ->
          %{error: inspect(other)}
      end

    {:reply, %{mode: :raft, node: to_string(node()), cluster: members}, state}
  end

  defp normalize_start(:ok), do: :ok
  defp normalize_start({:ok, _pid}), do: :ok
  defp normalize_start({:error, {:already_started, _pid}}), do: :ok
  defp normalize_start({:error, reason}), do: {:error, reason}

  defp normalize_data_dir(path) when is_binary(path), do: String.to_charlist(path)
  defp normalize_data_dir(path) when is_list(path), do: path

  defp normalize_reply({:ok, reply, _leader}), do: reply
  defp normalize_reply(other), do: {:error, other}

  defp connect_and_bootstrap(state) do
    peers = Enum.reject(state.nodes, &(&1 == node()))
    peers_available? = Enum.all?(peers, &Node.connect/1)
    restart_result = restart_local_server(state)

    cond do
      cluster_ready?(state.local) ->
        mark_ready(state)

      node() == state.bootstrap_node and peers_available? and
          restart_result == {:error, :name_not_registered} ->
        state
        |> start_cluster()
        |> maybe_mark_ready()

      true ->
        put_error(state, normalize_wait_error(restart_result))
    end
  end

  defp restart_local_server(state) do
    try do
      :ra.restart_server(state.system, state.local)
    catch
      :exit, reason -> {:error, reason}
    end
  end

  defp normalize_wait_error(:ok), do: :waiting_for_cluster
  defp normalize_wait_error({:error, {:already_started, _pid}}), do: :waiting_for_cluster
  defp normalize_wait_error(error), do: error

  defp start_cluster(state) do
    result =
      try do
        :ra.start_or_restart_cluster(
          state.system,
          state.cluster_name,
          {:module, OpsWard.Consensus.Machine, %{}},
          state.members
        )
      rescue
        error -> {:error, {:exception, error}}
      catch
        kind, reason -> {:error, {kind, reason}}
      end

    case result do
      {:ok, _started, _failed} -> state
      {:error, reason} -> put_error(state, reason)
    end
  end

  defp maybe_mark_ready(state) do
    if cluster_ready?(state.local), do: mark_ready(state), else: state
  end

  defp cluster_ready?(local) do
    match?({:ok, _members, _leader}, safe_members(local))
  end

  defp safe_members(local) do
    try do
      :ra.members(local)
    catch
      :exit, reason -> {:error, reason}
    end
  end

  defp mark_ready(%{ready: false} = state) do
    Logger.info("Raft consensus cluster is ready on #{node()}")
    %{state | ready: true, last_error: nil}
  end

  defp mark_ready(state), do: state

  defp put_error(%{last_error: error} = state, error), do: state

  defp put_error(state, error) do
    Logger.warning("Raft consensus is initializing: #{inspect(error)}")
    %{state | last_error: error}
  end
end
