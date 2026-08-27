defmodule OpsWard.Playbooks do
  import Ecto.Query

  alias Ecto.Multi
  alias OpsWard.Playbooks.Run
  alias OpsWard.Playbooks.Step
  alias OpsWard.Repo

  @definitions %{
    "database_failover" => [
      "freeze_writes",
      "promote_replica",
      "redirect_traffic",
      "verify_health"
    ],
    "kubernetes_healing" => ["cordon_node", "drain_workloads", "replace_node", "verify_cluster"]
  }

  def definitions, do: Map.keys(@definitions)

  def get_run(id) do
    Run |> Repo.get(id) |> Repo.preload(:steps)
  end

  def start_run(playbook, context \\ %{}) do
    with {:ok, steps} <- Map.fetch(@definitions, playbook) do
      Multi.new()
      |> Multi.insert(
        :run,
        Run.changeset(%Run{}, %{playbook: playbook, status: :pending, context: context})
      )
      |> Multi.run(:steps, fn repo, %{run: run} ->
        records =
          steps
          |> Enum.with_index()
          |> Enum.map(fn {name, position} ->
            %{
              run_id: run.id,
              name: name,
              position: position,
              status: :pending,
              inserted_at: now(),
              updated_at: now()
            }
          end)

        {count, _} = repo.insert_all(Step, records)
        {:ok, count}
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{run: run}} ->
          %{run_id: run.id, position: 0}
          |> OpsWard.Playbooks.OrchestratorWorker.new()
          |> Oban.insert()

          {:ok, get_run(run.id)}

        {:error, _operation, reason, _changes} ->
          {:error, reason}
      end
    else
      :error -> {:error, :unknown_playbook}
    end
  end

  def next_pending_step(run_id) do
    Step
    |> where([s], s.run_id == ^run_id and s.status == :pending)
    |> order_by([s], asc: s.position)
    |> limit(1)
    |> Repo.one()
  end

  def completed_steps(run_id) do
    Step
    |> where([s], s.run_id == ^run_id and s.status == :succeeded)
    |> order_by([s], desc: s.position)
    |> Repo.all()
  end

  defp now, do: DateTime.utc_now()
end
