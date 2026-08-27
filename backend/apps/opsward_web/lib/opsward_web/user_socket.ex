defmodule OpsWardWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", OpsWardWeb.RoomChannel

  def connect(%{"identity" => identity}, socket, _connect_info) when is_binary(identity) do
    {:ok, assign(socket, :identity, identity)}
  end

  def connect(_params, _socket, _connect_info), do: :error
  def id(socket), do: "user_socket:#{socket.assigns.identity}"
end
