defmodule OpsWardWeb.Plugs.ApiKey do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    case Application.get_env(:opsward_web, :api_key) do
      key when key in [nil, ""] -> conn
      key -> authorize(conn, key, get_req_header(conn, "x-api-key"))
    end
  end

  defp authorize(conn, expected, [provided]) when byte_size(expected) == byte_size(provided) do
    if Plug.Crypto.secure_compare(expected, provided), do: conn, else: reject(conn)
  end

  defp authorize(conn, _expected, _provided), do: reject(conn)

  defp reject(conn) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, Jason.encode!(%{error: "unauthorized"}))
    |> halt()
  end
end
