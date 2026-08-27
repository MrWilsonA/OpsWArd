defmodule OpsWardWeb.HealthControllerTest do
  use OpsWardWeb.ConnCase, async: true

  test "reports database health", %{conn: conn} do
    conn = get(conn, ~p"/api/v1/health")
    assert %{"status" => "ok", "database" => "up"} = json_response(conn, 200)
  end

  test "exposes Prometheus metrics", %{conn: conn} do
    conn = get(conn, ~p"/api/v1/metrics")
    assert response(conn, 200) =~ "opsward_up 1"
  end
end
