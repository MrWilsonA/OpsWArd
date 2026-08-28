defmodule OpsWard.Telemetry.IngestionPipeline do
  use Broadway

  alias Broadway.Message

  def start_link(_opts) do
    config = Application.fetch_env!(:opsward, :kafka)

    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module:
          {BroadwayKafka.Producer,
           hosts: config[:hosts], group_id: config[:group_id], topics: [config[:telemetry_topic]]},
        concurrency: 1
      ],
      processors: [default: [concurrency: System.schedulers_online()]]
    )
  end

  @impl true
  def handle_message(_processor, message, _context) do
    with {:ok, payload} <- Jason.decode(message.data),
         attrs <- enrich(payload, message.metadata),
         {:ok, _event} <- OpsWard.Telemetry.ingest(attrs) do
      message
    else
      {:error, reason} -> Message.failed(message, inspect(reason))
    end
  end

  @impl true
  def handle_failed(messages, _context) do
    config = Application.fetch_env!(:opsward, :kafka)

    Enum.map(messages, fn message ->
      metadata = message.metadata
      reason = inspect(message.status)

      OpsWard.Telemetry.record_failure(%{
        topic: metadata[:topic] || config[:telemetry_topic],
        partition: metadata[:partition],
        offset: metadata[:offset],
        raw_payload: message.data,
        reason: reason
      })

      OpsWard.Telemetry.KafkaClient.publish(config[:dlq_topic], message.data)
      message
    end)
  end

  defp enrich(payload, metadata) do
    payload
    |> Map.put_new("event_id", Ecto.UUID.generate())
    |> Map.put_new("source", "unknown")
    |> Map.put_new("kind", "telemetry")
    |> Map.put_new("payload", payload)
    |> Map.put_new("occurred_at", DateTime.utc_now())
    |> Map.put("partition", metadata[:partition])
    |> Map.put("offset", metadata[:offset])
  end
end
