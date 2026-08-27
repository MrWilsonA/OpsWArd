defmodule OpsWardWeb.IncidentController do
  use OpsWardWeb, :controller

  alias OpsWardWeb.Serializers

  def index(conn, _params),
    do: json(conn, %{data: Enum.map(OpsWard.Incidents.list_incidents(), &Serializers.incident/1)})

  def create(conn, params) do
    actor = get_req_header(conn, "x-opsward-actor") |> List.first() || "api"

    case OpsWard.Incidents.create_incident(params, actor) do
      {:ok, incident} ->
        conn |> put_status(:created) |> json(%{data: Serializers.incident(incident)})

      {:error, %Ecto.Changeset{} = changeset} ->
        conn |> put_status(:unprocessable_entity) |> json(%{errors: errors(changeset)})

      {:error, reason} ->
        conn |> put_status(:conflict) |> json(%{error: inspect(reason)})
    end
  end

  def resolve(conn, %{"id" => id}) do
    case OpsWard.Incidents.get_incident(id) do
      nil ->
        conn |> put_status(:not_found) |> json(%{error: "not_found"})

      incident ->
        case OpsWard.Incidents.resolve_incident(incident) do
          {:ok, updated} -> json(conn, %{data: Serializers.incident(updated)})
          {:error, reason} -> conn |> put_status(:conflict) |> json(%{error: inspect(reason)})
        end
    end
  end

  defp errors(changeset),
    do: Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
end
