defmodule OpsWard.Playbooks.Run do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}

  schema "playbook_runs" do
    field :playbook, :string
    field :status, Ecto.Enum, values: [:pending, :running, :compensating, :succeeded, :failed]
    field :context, :map, default: %{}
    field :current_step, :integer, default: 0
    field :error, :string
    field :started_at, :utc_datetime_usec
    field :finished_at, :utc_datetime_usec

    has_many :steps, OpsWard.Playbooks.Step, foreign_key: :run_id
    timestamps(type: :utc_datetime_usec)
  end

  def changeset(run, attrs) do
    run
    |> cast(attrs, [
      :playbook,
      :status,
      :context,
      :current_step,
      :error,
      :started_at,
      :finished_at
    ])
    |> validate_required([:playbook, :status])
  end
end
