defmodule OpsWard.TelemetryTest do
  use OpsWard.DataCase, async: true

  test "persists telemetry idempotently by event id" do
    attrs = %{
      "event_id" => "evt-1",
      "source" => "postgres-primary",
      "kind" => "health.failed",
      "payload" => %{"latency_ms" => 900}
    }

    assert {:ok, _event} = OpsWard.Telemetry.ingest(attrs)
    assert {:ok, _duplicate} = OpsWard.Telemetry.ingest(attrs)
    assert OpsWard.Repo.aggregate(OpsWard.Telemetry.Event, :count) == 1
  end
end
