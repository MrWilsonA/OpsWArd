defmodule OpsWard.Playbooks.CompensationWorker do
  use Oban.Worker, queue: :compensation, max_attempts: 10, unique: [period: 60, fields: [:args]]

  alias OpsWard.Playbooks.Run
  alias OpsWard.Playbooks.Step
  alias OpsWard.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"run_id" => run_id}}) do
    run = Repo.get!(Run, run_id)

    run_id
    |> OpsWard.Playbooks.completed_steps()
    |> Enum.each(fn step ->
      {:ok, result} = OpsWard.Playbooks.Actions.compensate(step.name, run.context)

      {:ok, _step} =
        step |> Step.changeset(%{status: :compensated, result: result}) |> Repo.update()
    end)

    {:ok, _run} =
      run |> Run.changeset(%{status: :failed, finished_at: DateTime.utc_now()}) |> Repo.update()

    :ok
  end
end
