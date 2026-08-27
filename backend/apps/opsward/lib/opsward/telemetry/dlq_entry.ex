defmodule OpsWard.Telemetry.DlqEntry do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "dlq_entries" do
    field :topic, :string
    field :partition, :integer
    field :offset, :integer
    field :raw_payload, :binary
    field :reason, :string
    field :replayed_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(entry, attrs) do
    entry
    |> cast(attrs, [:topic, :partition, :offset, :raw_payload, :reason, :replayed_at])
    |> validate_required([:topic, :raw_payload, :reason])
  end
end
