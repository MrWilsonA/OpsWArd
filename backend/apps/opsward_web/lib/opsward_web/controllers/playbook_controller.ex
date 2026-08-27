defmodule OpsWardWeb.PlaybookController do
  use OpsWardWeb, :controller

  alias OpsWardWeb.Serializers

  def definitions(conn, _params), do: json(conn, %{data: OpsWard.Playbooks.definitions()})

  def show(conn, %{"id" => id}) do
    case OpsWard.Playbooks.get_run(id) do
      nil -> conn |> put_status(:not_found) |> json(%{error: "not_found"})
      run -> json(conn, %{data: Serializers.playbook_run(run)})
    end
  end

  def create(conn, %{"playbook" => playbook} = params) do
    case OpsWard.Playbooks.start_run(playbook, Map.get(params, "context", %{})) do
      {:ok, run} ->
        conn |> put_status(:accepted) |> json(%{data: Serializers.playbook_run(run)})

      {:error, :unknown_playbook} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "unknown_playbook"})

      {:error, reason} ->
        conn |> put_status(:conflict) |> json(%{error: inspect(reason)})
    end
  end
end
