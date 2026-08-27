defmodule OpsWard.PlaybooksTest do
  use OpsWard.DataCase, async: false
  use Oban.Testing, repo: OpsWard.Repo

  test "creates an ordered saga and enqueues orchestration" do
    assert {:ok, run} =
             OpsWard.Playbooks.start_run("database_failover", %{"idempotency_key" => "db-42"})

    assert run.status == :pending
    assert length(run.steps) == 4
    assert Enum.map(run.steps, & &1.position) == [0, 1, 2, 3]

    assert_enqueued(
      worker: OpsWard.Playbooks.OrchestratorWorker,
      args: %{run_id: run.id, position: 0}
    )
  end

  test "runs every saga step to completion" do
    assert {:ok, run} = OpsWard.Playbooks.start_run("database_failover")

    drain_queue(:playbooks, 5)

    completed = OpsWard.Playbooks.get_run(run.id)
    assert completed.status == :succeeded
    assert Enum.all?(completed.steps, &(&1.status == :succeeded))
  end

  test "compensates completed steps after a failure" do
    assert {:ok, run} =
             OpsWard.Playbooks.start_run("database_failover", %{
               "fail_step" => "promote_replica"
             })

    drain_queue(:playbooks, 2)
    drain_queue(:compensation, 1)

    compensated = OpsWard.Playbooks.get_run(run.id)
    assert compensated.status == :failed

    assert Enum.map(compensated.steps, & &1.status) == [
             :compensated,
             :failed,
             :pending,
             :pending
           ]
  end

  test "rejects an unknown playbook" do
    assert {:error, :unknown_playbook} = OpsWard.Playbooks.start_run("delete_everything")
  end

  defp drain_queue(queue, times) do
    Enum.each(1..times, fn _ -> Oban.drain_queue(queue: queue) end)
  end
end
