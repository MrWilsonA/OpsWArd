defmodule OpsWard.Consensus.Machine do
  @behaviour :ra_machine

  @impl true
  def init(_config), do: %{index: 0, incidents: %{}}

  @impl true
  def apply(_meta, command, state) do
    next = apply_command(command, state)
    {next, {:ok, next.index}}
  end

  defp apply_command({:declare_incident, id, severity}, state) do
    incident = %{severity: severity, status: "declared"}
    %{state | index: state.index + 1, incidents: Map.put(state.incidents, id, incident)}
  end

  defp apply_command({:resolve_incident, id}, state) do
    incidents =
      Map.update(state.incidents, id, %{status: "resolved"}, &Map.put(&1, :status, "resolved"))

    %{state | index: state.index + 1, incidents: incidents}
  end

  defp apply_command(_command, state), do: %{state | index: state.index + 1}
end
