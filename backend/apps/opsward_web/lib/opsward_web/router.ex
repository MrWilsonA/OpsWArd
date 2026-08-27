defmodule OpsWardWeb.Router do
  use OpsWardWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug OpsWardWeb.Plugs.ApiKey
  end

  scope "/api/v1", OpsWardWeb do
    get "/health", HealthController, :show
    get "/metrics", MetricsController, :show
  end

  scope "/api", OpsWardWeb do
    pipe_through :api

    get "/v1/incidents", IncidentController, :index
    post "/v1/incidents", IncidentController, :create
    post "/v1/incidents/:id/resolve", IncidentController, :resolve
    get "/v1/playbooks", PlaybookController, :definitions
    post "/v1/playbook-runs", PlaybookController, :create
    get "/v1/playbook-runs/:id", PlaybookController, :show
    post "/v1/telemetry", TelemetryController, :create
    get "/v1/telemetry/dlq", TelemetryController, :dlq
    post "/v1/telemetry/dlq/:id/replay", TelemetryController, :replay
    get "/v1/consensus", SystemController, :consensus
    post "/v1/media/token", SystemController, :media_token
    post "/v1/spatial/proximity", SystemController, :proximity
  end
end
