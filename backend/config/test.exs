import Config

config :opsward, Oban, testing: :manual
config :opsward, :kafka, enabled: false
config :opsward, :raft, enabled: false
config :opsward, :grpc, enabled: false

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :opsward, OpsWard.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "opsward_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :opsward_web, OpsWardWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "r2hDmXi2biVDuftgbuGCG4jWvur1pPg9rcXkUEw/oJZJZXJ3Ci1fDZJvN6lBjV9G",
  server: false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true
