defmodule OpsWard.Consensus.Cluster do
  use GenServer
  require Logger

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  def commit(command), do: GenServer.call(__MODULE__, {:commit, command}, 10_000)
  def status, do: GenServer.call(__MODULE__, :status)

  @impl true
  def init(_state) do
    config = Application.fetch_env!(:opsward, :raft)
    Enum.each(config[:nodes] || [], &Node.connect/1)
    Application.put_env(:ra, :data_dir, config[:data_dir])
    :ok = normalize_start(:ra_system.start_default())

    nodes = Enum.uniq([node() | config[:nodes] || []])
    members = Enum.map(nodes, &{config[:cluster_name], &1})

    result =
      :ra.start_or_restart_cluster(
        config[:system],
        config[:cluster_name],
        {:machine, OpsWard.Consensus.Machine, %{}},
        members
      )

    case result do
      {:ok, _started, _failed} ->
        {:ok, %{members: members, local: {config[:cluster_name], node()}}}

      {:error, reason} ->
        {:stop, reason}
    end
  end

  @impl true
  def handle_call({:commit, command}, _from, state) do
    reply = :ra.process_command(state.local, command, 8_000)
    {:reply, normalize_reply(reply), state}
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

  defp normalize_reply({:ok, reply, _leader}), do: reply
  defp normalize_reply(other), do: {:error, other}
end
