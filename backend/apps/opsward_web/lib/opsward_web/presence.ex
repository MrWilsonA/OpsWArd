defmodule OpsWardWeb.Presence do
  use Phoenix.Presence, otp_app: :opsward_web, pubsub_server: OpsWard.PubSub
end
