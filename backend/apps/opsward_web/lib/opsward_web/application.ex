defmodule OpsWardWeb.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      OpsWardWeb.Telemetry,
      OpsWardWeb.Presence,
      # Start a worker by calling: OpsWardWeb.Worker.start_link(arg)
      # {OpsWardWeb.Worker, arg},
      # Start to serve requests, typically the last entry
      OpsWardWeb.Endpoint
    ]

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: OpsWardWeb.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    OpsWardWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
