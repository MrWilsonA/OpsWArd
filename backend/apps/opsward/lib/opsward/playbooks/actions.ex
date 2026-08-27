defmodule OpsWard.Playbooks.Actions do
  @spec execute(String.t(), map()) :: {:ok, map()} | {:error, term()}
  def execute(step, context) do
    if context["fail_step"] == step do
      {:error, {:injected_failure, step}}
    else
      {:ok,
       %{
         action: step,
         completed_at: DateTime.utc_now(),
         idempotency_key: context["idempotency_key"]
       }}
    end
  end

  @spec compensate(String.t(), map()) :: {:ok, map()}
  def compensate(step, _context) do
    {:ok, %{action: "undo_#{step}", completed_at: DateTime.utc_now()}}
  end
end
