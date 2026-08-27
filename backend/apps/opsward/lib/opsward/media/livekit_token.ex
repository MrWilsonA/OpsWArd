defmodule OpsWard.Media.LiveKitToken do
  @algorithm "HS256"

  def issue(identity, room, metadata \\ %{}) when is_binary(identity) and is_binary(room) do
    config = Application.fetch_env!(:opsward, :livekit)
    now = System.system_time(:second)

    claims = %{
      iss: config[:api_key],
      sub: identity,
      nbf: now,
      exp: now + config[:token_ttl_seconds],
      metadata: Jason.encode!(metadata),
      video: %{roomJoin: true, room: room, canPublish: true, canSubscribe: true}
    }

    header = %{alg: @algorithm, typ: "JWT"}
    signing_input = encode(header) <> "." <> encode(claims)

    signature =
      :crypto.mac(:hmac, :sha256, config[:api_secret], signing_input)
      |> Base.url_encode64(padding: false)

    {:ok, %{token: signing_input <> "." <> signature, url: config[:url], expires_at: claims.exp}}
  end

  defp encode(value), do: value |> Jason.encode!() |> Base.url_encode64(padding: false)
end
