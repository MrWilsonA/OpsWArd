defmodule OpsWard.Repo.Migrations.CreateOpswardCore do
  use Ecto.Migration

  def up do
    create table(:incidents, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :title, :string, null: false
      add :description, :text
      add :severity, :string, null: false
      add :status, :string, null: false
      add :commander, :string
      add :metadata, :map, null: false, default: %{}
      add :declared_at, :utc_datetime_usec, null: false
      add :resolved_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:incidents, [:status, :declared_at])

    create table(:audit_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :actor, :string, null: false
      add :action, :string, null: false
      add :resource_type, :string, null: false
      add :resource_id, :binary_id
      add :payload, :map, null: false, default: %{}
      add :correlation_id, :string
      add :occurred_at, :utc_datetime_usec, null: false
      timestamps(updated_at: false, type: :utc_datetime_usec)
    end

    create index(:audit_entries, [:resource_type, :resource_id])
    create index(:audit_entries, [:correlation_id])

    create table(:playbook_runs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :playbook, :string, null: false
      add :status, :string, null: false
      add :context, :map, null: false, default: %{}
      add :current_step, :integer, null: false, default: 0
      add :error, :text
      add :started_at, :utc_datetime_usec
      add :finished_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:playbook_runs, [:status, :inserted_at])

    create table(:playbook_steps, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :run_id, references(:playbook_runs, type: :binary_id, on_delete: :delete_all),
        null: false

      add :position, :integer, null: false
      add :name, :string, null: false
      add :status, :string, null: false
      add :result, :map, null: false, default: %{}
      add :error, :text
      add :started_at, :utc_datetime_usec
      add :finished_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:playbook_steps, [:run_id, :position])

    create table(:telemetry_events, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :event_id, :string, null: false
      add :source, :string, null: false
      add :kind, :string, null: false
      add :payload, :map, null: false
      add :occurred_at, :utc_datetime_usec, null: false
      add :partition, :integer
      add :offset, :bigint
      timestamps(updated_at: false, type: :utc_datetime_usec)
    end

    create unique_index(:telemetry_events, [:event_id])
    create index(:telemetry_events, [:source, :kind, :occurred_at])

    create table(:dlq_entries, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :topic, :string, null: false
      add :partition, :integer
      add :offset, :bigint
      add :raw_payload, :binary, null: false
      add :reason, :text, null: false
      add :replayed_at, :utc_datetime_usec
      timestamps(type: :utc_datetime_usec)
    end

    create index(:dlq_entries, [:replayed_at, :inserted_at])
    Oban.Migrations.up(version: 14)
  end

  def down do
    Oban.Migrations.down(version: 1)
    drop table(:dlq_entries)
    drop table(:telemetry_events)
    drop table(:playbook_steps)
    drop table(:playbook_runs)
    drop table(:audit_entries)
    drop table(:incidents)
  end
end
