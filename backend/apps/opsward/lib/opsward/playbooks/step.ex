defmodule OpsWard.Playbooks.Step do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "playbook_steps" do
    field :position, :integer
    field :name, :string
    field :status, Ecto.Enum, values: [:pending, :running, :succeeded, :failed, :compensated]
    field :result, :map, default: %{}
    field :error, :string
    field :started_at, :utc_datetime_usec
    field :finished_at, :utc_datetime_usec

    belongs_to :run, OpsWard.Playbooks.Run
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(step, attrs) do
    step
    |> cast(attrs, [
      :run_id,
      :position,
      :name,
      :status,
      :result,
      :error,
      :started_at,
      :finished_at
    ])
    |> validate_required([:run_id, :position, :name, :status])
    |> unique_constraint([:run_id, :position])
  end
end
