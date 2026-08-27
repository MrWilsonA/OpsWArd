defmodule OpsWard.Audit do
  alias OpsWard.Audit.AuditEntry
  alias OpsWard.Repo

  def record(attrs) do
    attrs = Map.put_new(attrs, :occurred_at, DateTime.utc_now())
    %AuditEntry{} |> AuditEntry.changeset(attrs) |> Repo.insert()
  end
end
