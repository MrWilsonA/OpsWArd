defmodule OpsWard.Repo do
  use Ecto.Repo,
    otp_app: :opsward,
    adapter: Ecto.Adapters.Postgres
end
