defmodule OpsWard.Playbooks.OrchestratorWorker do
  use Oban.Worker, queue: :playbooks, max_attempts: 5, unique: [period: 60, fields: [:args]]

  alias OpsWard.Playbooks.Run
  alias OpsWard.Playbooks.Step
  alias OpsWard.Repo

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"run_id" => run_id}}) do
    run = Repo.get!(Run, run_id)

    case OpsWard.Playbooks.next_pending_step(run_id) do
      nil -> finish_run(run)
      step -> execute_step(run, step)
    end
  end

  defp execute_step(run, step) do
    now = DateTime.utc_now()
    {:ok, step} = step |> Step.changeset(%{status: :running, started_at: now}) |> Repo.update()

    case OpsWard.Playbooks.Actions.execute(step.name, run.context) do
      {:ok, result} ->
        {:ok, _step} =
          step
          |> Step.changeset(%{
            status: :succeeded,
            result: result,
            finished_at: DateTime.utc_now()
          })
          |> Repo.update()

        {:ok, _run} =
          run
          |> Run.changeset(%{
            status: :running,
            current_step: step.position + 1,
            started_at: run.started_at || now
          })
          |> Repo.update()

        {:ok, _job} =
          %{run_id: run.id, position: step.position + 1}
          |> __MODULE__.new()
          |> Oban.insert()

        :ok

      {:error, reason} ->
        {:ok, _step} =
          step
          |> Step.changeset(%{
            status: :failed,
            error: inspect(reason),
            finished_at: DateTime.utc_now()
          })
          |> Repo.update()

        {:ok, _run} =
          run |> Run.changeset(%{status: :compensating, error: inspect(reason)}) |> Repo.update()

        {:ok, _job} =
          %{run_id: run.id}
          |> OpsWard.Playbooks.CompensationWorker.new()
          |> Oban.insert()

        {:cancel, inspect(reason)}
    end
  end

  defp finish_run(run) do
    run |> Run.changeset(%{status: :succeeded, finished_at: DateTime.utc_now()}) |> Repo.update()
    :ok
  end
end
