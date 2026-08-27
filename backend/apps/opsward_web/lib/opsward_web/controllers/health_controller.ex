defmodule OpsWardWeb.HealthController do
  use OpsWardWeb, :controller

  def show(conn, _params) do
    database = if match?({:ok, _}, OpsWard.Repo.query("SELECT 1")), do: "up", else: "down"
    status = if database == "up", do: 200, else: 503

    conn
    |> put_status(status)
    |> json(%{status: if(status == 200, do: "ok", else: "degraded"), database: database})
  end
end
