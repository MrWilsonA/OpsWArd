defmodule OpsWard.Incidents.Incident do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "incidents" do
    field :title, :string
    field :description, :string
    field :severity, Ecto.Enum, values: [:low, :medium, :high, :critical]
    field :status, Ecto.Enum, values: [:declared, :investigating, :mitigated, :resolved]
    field :commander, :string
    field :metadata, :map, default: %{}
    field :declared_at, :utc_datetime_usec
    field :resolved_at, :utc_datetime_usec

    timestamps(type: :utc_datetime_usec)
  end

  def changeset(incident, attrs) do
    incident
    |> cast(attrs, [
      :title,
      :description,
      :severity,
      :status,
      :commander,
      :metadata,
      :declared_at,
      :resolved_at
    ])
    |> validate_required([:title, :severity, :status, :declared_at])
    |> validate_length(:title, min: 3, max: 200)
  end
end
