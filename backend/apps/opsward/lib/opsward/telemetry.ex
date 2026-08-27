defmodule OpsWard.Telemetry do
  import Ecto.Query

  alias OpsWard.Repo
  alias OpsWard.Telemetry.DlqEntry
  alias OpsWard.Telemetry.Event
  alias OpsWard.Telemetry.KafkaClient

  def ingest(attrs) do
    attrs = Map.put_new(attrs, "occurred_at", DateTime.utc_now())

    %Event{}
    |> Event.changeset(attrs)
    |> Repo.insert(on_conflict: :nothing, conflict_target: :event_id)
  end

  def list_dlq(limit \\ 100) do
    DlqEntry
    |> where([d], is_nil(d.replayed_at))
    |> order_by([d], desc: d.inserted_at)
    |> limit(^limit)
    |> Repo.all()
  end

  def record_failure(attrs), do: %DlqEntry{} |> DlqEntry.changeset(attrs) |> Repo.insert()

  def replay_dlq(id) do
    with %DlqEntry{} = entry <- Repo.get(DlqEntry, id),
         {:ok, _offset} <- KafkaClient.publish(entry.topic, entry.raw_payload),
         {:ok, updated} <-
           entry |> DlqEntry.changeset(%{replayed_at: DateTime.utc_now()}) |> Repo.update() do
      {:ok, updated}
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end
end
