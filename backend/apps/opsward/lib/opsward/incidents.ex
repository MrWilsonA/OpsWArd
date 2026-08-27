defmodule OpsWard.Incidents do
  import Ecto.Query

  alias Ecto.Multi
  alias OpsWard.Audit.AuditEntry
  alias OpsWard.Incidents.Incident
  alias OpsWard.Repo

  def list_incidents do
    Incident |> order_by([i], desc: i.declared_at) |> Repo.all()
  end

  def get_incident(id), do: Repo.get(Incident, id)

  def create_incident(attrs, actor \\ "system") do
    now = DateTime.utc_now()

    attrs =
      attrs
      |> Map.put_new("status", "declared")
      |> Map.put_new("declared_at", now)

    Multi.new()
    |> Multi.insert(:incident, Incident.changeset(%Incident{}, attrs))
    |> Multi.run(:consensus, fn _repo, %{incident: incident} ->
      OpsWard.Consensus.commit(
        {:declare_incident, incident.id, Atom.to_string(incident.severity)}
      )
    end)
    |> Multi.insert(:audit, fn %{incident: incident} ->
      AuditEntry.changeset(%AuditEntry{}, %{
        actor: actor,
        action: "incident.declared",
        resource_type: "incident",
        resource_id: incident.id,
        correlation_id: incident.id,
        payload: %{severity: incident.severity},
        occurred_at: now
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{incident: incident}} -> {:ok, incident}
      {:error, _operation, reason, _changes} -> {:error, reason}
    end
  end

  def resolve_incident(%Incident{} = incident, actor \\ "system") do
    now = DateTime.utc_now()

    Multi.new()
    |> Multi.update(
      :incident,
      Incident.changeset(incident, %{status: :resolved, resolved_at: now})
    )
    |> Multi.run(:consensus, fn _repo, %{incident: updated} ->
      OpsWard.Consensus.commit({:resolve_incident, updated.id})
    end)
    |> Multi.run(:audit, fn _repo, %{incident: updated} ->
      OpsWard.Audit.record(%{
        actor: actor,
        action: "incident.resolved",
        resource_type: "incident",
        resource_id: updated.id,
        correlation_id: updated.id,
        occurred_at: now
      })
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{incident: updated}} -> {:ok, updated}
      {:error, _operation, reason, _changes} -> {:error, reason}
    end
  end
end
