defmodule OpsWardWeb.SystemController do
  use OpsWardWeb, :controller

  def consensus(conn, _params), do: json(conn, %{data: OpsWard.Consensus.status()})

  def media_token(conn, %{"identity" => identity, "room" => room} = params) do
    {:ok, token} =
      OpsWard.Media.LiveKitToken.issue(identity, room, Map.get(params, "metadata", %{}))

    json(conn, %{data: token})
  end

  def proximity(conn, %{"from" => [x1, y1], "to" => [x2, y2]}) do
    json(conn, %{data: %{gain: OpsWard.Spatial.Proximity.gain({x1, y1}, {x2, y2})}})
  end
end
