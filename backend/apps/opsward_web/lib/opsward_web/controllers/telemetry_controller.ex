defmodule OpsWardWeb.TelemetryController do
  use OpsWardWeb, :controller

  alias OpsWardWeb.Serializers

  def create(conn, params) do
    case OpsWard.Telemetry.ingest(params) do
      {:ok, event} ->
        conn |> put_status(:accepted) |> json(%{data: %{id: event.id, event_id: event.event_id}})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(changeset.errors)})
    end
  end

  def dlq(conn, _params),
    do: json(conn, %{data: Enum.map(OpsWard.Telemetry.list_dlq(), &Serializers.dlq/1)})

  def replay(conn, %{"id" => id}) do
    case OpsWard.Telemetry.replay_dlq(id) do
      {:ok, entry} ->
        json(conn, %{data: Serializers.dlq(entry)})

      {:error, :not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "not_found"})

      {:error, reason} ->
        conn |> put_status(:service_unavailable) |> json(%{error: inspect(reason)})
    end
  end
end
