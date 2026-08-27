defmodule OpsWard.Media.LiveKitTokenTest do
  use ExUnit.Case, async: true

  test "issues a room-scoped signed token" do
    assert {:ok, %{token: token, url: url, expires_at: expires_at}} =
             OpsWard.Media.LiveKitToken.issue("theresa", "incident-42", %{role: "security"})

    assert url == "ws://localhost:7880"
    assert expires_at > System.system_time(:second)

    [header, claims, signature] = String.split(token, ".")
    assert byte_size(signature) > 20
    assert %{"alg" => "HS256"} = decode(header)

    assert %{"sub" => "theresa", "video" => %{"room" => "incident-42", "roomJoin" => true}} =
             decode(claims)
  end

  defp decode(segment) do
    segment |> Base.url_decode64!(padding: false) |> Jason.decode!()
  end
end
