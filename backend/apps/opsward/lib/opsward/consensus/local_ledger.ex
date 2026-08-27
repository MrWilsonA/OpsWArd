defmodule OpsWard.Consensus.LocalLedger do
  use GenServer

  def start_link(_opts), do: GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  def commit(command), do: GenServer.call(__MODULE__, {:commit, command})
  def status, do: GenServer.call(__MODULE__, :status)

  @impl true
  def init(_state), do: {:ok, %{index: 0, last_command: nil}}

  @impl true
  def handle_call({:commit, command}, _from, state) do
    state = %{index: state.index + 1, last_command: command}
    {:reply, {:ok, state.index}, state}
  end

  def handle_call(:status, _from, state) do
    {:reply, %{mode: :local, node: node(), index: state.index}, state}
  end
end
