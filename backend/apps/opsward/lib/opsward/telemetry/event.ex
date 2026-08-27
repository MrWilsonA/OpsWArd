defmodule OpsWard.Telemetry.Event do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "telemetry_events" do
    field :event_id, :string
    field :source, :string
    field :kind, :string
    field :payload, :map
    field :occurred_at, :utc_datetime_usec
    field :partition, :integer
    field :offset, :integer

    timestamps(updated_at: false, type: :utc_datetime_usec)
  end

  def changeset(event, attrs) do
    event
    |> cast(attrs, [:event_id, :source, :kind, :payload, :occurred_at, :partition, :offset])
    |> validate_required([:event_id, :source, :kind, :payload, :occurred_at])
    |> unique_constraint(:event_id)
  end
end
