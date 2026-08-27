defmodule OpsWardWeb.RoomChannel do
  use OpsWardWeb, :channel

  @impl true
  def join("room:" <> _room, _payload, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      OpsWardWeb.Presence.track(socket, socket.assigns.identity, %{
        x: 0,
        y: 0,
        online_at: System.system_time(:second)
      })

    push(socket, "presence_state", OpsWardWeb.Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("position", %{"x" => x, "y" => y}, socket) when is_number(x) and is_number(y) do
    {:ok, _} =
      OpsWardWeb.Presence.update(socket, socket.assigns.identity, %{
        x: x,
        y: y,
        online_at: System.system_time(:second)
      })

    broadcast_from!(socket, "position", %{identity: socket.assigns.identity, x: x, y: y})
    {:reply, :ok, socket}
  end
end
