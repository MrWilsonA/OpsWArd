defmodule OpsWardWeb.IncidentControllerTest do
  use OpsWardWeb.ConnCase, async: false

  test "declares and lists an incident", %{conn: conn} do
    payload = %{title: "Kafka partition stalled", severity: "high"}
    created = conn |> post(~p"/api/v1/incidents", payload) |> json_response(201)
    assert created["data"]["status"] == "declared"

    listed = build_conn() |> get(~p"/api/v1/incidents") |> json_response(200)
    assert Enum.any?(listed["data"], &(&1["title"] == "Kafka partition stalled"))
  end
end
