defmodule OpsWard.Audit.AuditEntry do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "audit_entries" do
    field :actor, :string
    field :action, :string
    field :resource_type, :string
    field :resource_id, :binary_id
    field :payload, :map, default: %{}
    field :correlation_id, :string
    field :occurred_at, :utc_datetime_usec

    timestamps(updated_at: false, type: :utc_datetime_usec)
  end

  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [
      :actor,
      :action,
      :resource_type,
      :resource_id,
      :payload,
      :correlation_id,
      :occurred_at
    ])
    |> validate_required([:actor, :action, :resource_type, :occurred_at])
  end
end
