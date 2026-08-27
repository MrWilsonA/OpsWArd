defmodule OpsWard.IncidentsTest do
  use OpsWard.DataCase, async: false

  test "declares and resolves an audited incident" do
    assert {:ok, incident} =
             OpsWard.Incidents.create_incident(
               %{"title" => "Primary database unavailable", "severity" => "critical"},
               "theresa"
             )

    assert incident.status == :declared
    assert incident.severity == :critical

    assert {:ok, resolved} = OpsWard.Incidents.resolve_incident(incident, "eric")
    assert resolved.status == :resolved
    assert resolved.resolved_at

    assert OpsWard.Repo.aggregate(OpsWard.Audit.AuditEntry, :count) == 2
  end

  test "rejects incomplete incidents" do
    assert {:error, %Ecto.Changeset{}} = OpsWard.Incidents.create_incident(%{"severity" => "low"})
  end
end
