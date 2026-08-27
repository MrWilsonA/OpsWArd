defmodule OpsWardWeb.Serializers do
  def incident(incident) do
    %{
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      commander: incident.commander,
      metadata: incident.metadata,
      declared_at: incident.declared_at,
      resolved_at: incident.resolved_at
    }
  end

  def playbook_run(run) do
    %{
      id: run.id,
      playbook: run.playbook,
      status: run.status,
      context: run.context,
      current_step: run.current_step,
      error: run.error,
      steps: Enum.map(run.steps, &playbook_step/1)
    }
  end

  defp playbook_step(step) do
    %{
      id: step.id,
      position: step.position,
      name: step.name,
      status: step.status,
      result: step.result,
      error: step.error
    }
  end

  def dlq(entry) do
    %{
      id: entry.id,
      topic: entry.topic,
      partition: entry.partition,
      offset: entry.offset,
      reason: entry.reason,
      inserted_at: entry.inserted_at,
      replayed_at: entry.replayed_at
    }
  end
end
