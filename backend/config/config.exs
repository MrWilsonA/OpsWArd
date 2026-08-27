# This file is responsible for configuring your umbrella
# and **all applications** and their dependencies with the
# help of the Config module.
#
# Note that all applications in your umbrella share the
# same configuration and dependencies, which is why they
# all use the same configuration file. If you want different
# configurations or dependencies per app, it is best to
# move said applications out of the umbrella.
import Config

# Configure Mix tasks and generators
config :opsward,
  namespace: OpsWard,
  ecto_repos: [OpsWard.Repo]

config :opsward, Oban,
  repo: OpsWard.Repo,
  queues: [playbooks: 10, compensation: 5, telemetry: 20, dlq: 5],
  plugins: [{Oban.Plugins.Pruner, max_age: 86_400}]

config :opsward, :kafka,
  enabled: false,
  hosts: [{"localhost", 9092}],
  client_id: :opsward_kafka,
  group_id: "opsward-telemetry-v1",
  telemetry_topic: "opsward.telemetry.v1",
  dlq_topic: "opsward.telemetry.dlq.v1",
  audit_topic: "opsward.audit.v1"

config :opsward, :raft,
  enabled: false,
  cluster_name: :opsward_ledger,
  system: :default,
  data_dir: "data/raft"

config :opsward, :grpc,
  enabled: false,
  port: 50_051

config :opsward, :livekit,
  url: "ws://localhost:7880",
  api_key: "devkey",
  api_secret: "secret",
  token_ttl_seconds: 3_600

config :opsward_web,
  namespace: OpsWardWeb,
  ecto_repos: [OpsWard.Repo],
  generators: [context_app: :opsward]

# Configures the endpoint
config :opsward_web, OpsWardWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: OpsWardWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: OpsWard.PubSub,
  live_view: [signing_salt: "6s5xTJ7q"]

config :opsward_web,
  api_key: nil,
  cors_origins: ["http://localhost:3000"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
