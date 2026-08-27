import Config

# config/runtime.exs is executed for all environments, including
# during releases. It is executed after compilation and before the
# system starts, so it is typically used to load production configuration
# and secrets from environment variables or elsewhere. Do not define
# any compile-time configuration in here, as it won't be applied.
# The block below contains prod specific runtime configuration.

config :opsward_web, OpsWardWeb.Endpoint,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))]

parse_bool = fn value -> String.downcase(to_string(value)) in ["1", "true", "yes", "on"] end

kafka_hosts =
  System.get_env("KAFKA_BROKERS", "localhost:9092")
  |> String.split(",", trim: true)
  |> Enum.map(fn broker ->
    case String.split(broker, ":", parts: 2) do
      [host, port] -> {host, String.to_integer(port)}
      [host] -> {host, 9092}
    end
  end)

config :opsward, :kafka,
  enabled: parse_bool.(System.get_env("KAFKA_ENABLED", "false")),
  hosts: kafka_hosts,
  client_id: :opsward_kafka,
  group_id: System.get_env("KAFKA_GROUP_ID", "opsward-telemetry-v1"),
  telemetry_topic: System.get_env("KAFKA_TELEMETRY_TOPIC", "opsward.telemetry.v1"),
  dlq_topic: System.get_env("KAFKA_DLQ_TOPIC", "opsward.telemetry.dlq.v1"),
  audit_topic: System.get_env("KAFKA_AUDIT_TOPIC", "opsward.audit.v1")

raft_nodes =
  System.get_env("RAFT_NODES", "")
  |> String.split(",", trim: true)
  |> Enum.reject(&(&1 == ""))
  |> Enum.map(&String.to_atom/1)

config :opsward, :raft,
  enabled: parse_bool.(System.get_env("RAFT_ENABLED", "false")),
  cluster_name: :opsward_ledger,
  system: :default,
  nodes: raft_nodes,
  data_dir: System.get_env("RAFT_DATA_DIR", "data/raft")

config :opsward, :grpc,
  enabled: parse_bool.(System.get_env("GRPC_ENABLED", "false")),
  port: String.to_integer(System.get_env("GRPC_PORT", "50051"))

config :opsward, :livekit,
  url: System.get_env("LIVEKIT_URL", "ws://localhost:7880"),
  api_key: System.get_env("LIVEKIT_API_KEY", "devkey"),
  api_secret: System.get_env("LIVEKIT_API_SECRET", "secret"),
  token_ttl_seconds: String.to_integer(System.get_env("LIVEKIT_TOKEN_TTL", "3600"))

cors_origins =
  System.get_env("CORS_ORIGINS", "http://localhost:3000")
  |> String.split(",", trim: true)

config :opsward_web,
  api_key: System.get_env("OPSWARD_API_KEY"),
  cors_origins: cors_origins

config :opsward_web, OpsWardWeb.Endpoint, check_origin: cors_origins

if config_env() == :prod do
  host = System.get_env("PHX_HOST", "example.com")
  scheme = System.get_env("PHX_SCHEME", "https")

  url_port =
    String.to_integer(
      System.get_env("PHX_URL_PORT", if(scheme == "https", do: "443", else: "80"))
    )

  database_url =
    System.get_env("DATABASE_URL") ||
      raise """
      environment variable DATABASE_URL is missing.
      For example: ecto://USER:PASS@HOST/DATABASE
      """

  maybe_ipv6 = if System.get_env("ECTO_IPV6") in ~w(true 1), do: [:inet6], else: []

  config :opsward, OpsWard.Repo,
    # ssl: true,
    url: database_url,
    pool_size: String.to_integer(System.get_env("POOL_SIZE") || "10"),
    # For machines with several cores, consider starting multiple pools of `pool_size`
    # pool_count: 4,
    socket_options: maybe_ipv6

  # The secret key base is used to sign/encrypt cookies and other secrets.
  # A default value is used in config/dev.exs and config/test.exs but you
  # want to use a different value for prod and you most likely don't want
  # to check this value into version control, so we use an environment
  # variable instead.
  secret_key_base =
    System.get_env("SECRET_KEY_BASE") ||
      raise """
      environment variable SECRET_KEY_BASE is missing.
      You can generate one by calling: mix phx.gen.secret
      """

  config :opsward_web, OpsWardWeb.Endpoint,
    url: [host: host, port: url_port, scheme: scheme],
    http: [
      # Enable IPv6 and bind on all interfaces.
      # Set it to  {0, 0, 0, 0, 0, 0, 0, 1} for local network only access.
      ip: {0, 0, 0, 0, 0, 0, 0, 0}
    ],
    secret_key_base: secret_key_base,
    server: true

  # ## Using releases
  #
  # If you are doing OTP releases, you need to instruct Phoenix
  # to start each relevant endpoint:
  #
  #     config :opsward_web, OpsWardWeb.Endpoint, server: true
  #
  # Then you can assemble a release by calling `mix release`.
  # See `mix help release` for more information.

  # ## SSL Support
  #
  # To get SSL working, you will need to add the `https` key
  # to your endpoint configuration:
  #
  #     config :opsward_web, OpsWardWeb.Endpoint,
  #       https: [
  #         ...,
  #         port: 443,
  #         cipher_suite: :strong,
  #         keyfile: System.get_env("SOME_APP_SSL_KEY_PATH"),
  #         certfile: System.get_env("SOME_APP_SSL_CERT_PATH")
  #       ]
  #
  # The `cipher_suite` is set to `:strong` to support only the
  # latest and more secure SSL ciphers. This means old browsers
  # and clients may not be supported. You can set it to
  # `:compatible` for wider support.
  #
  # `:keyfile` and `:certfile` expect an absolute path to the key
  # and cert in disk or a relative path inside priv, for example
  # "priv/ssl/server.key". For all supported SSL configuration
  # options, see https://plug.hexdocs.pm/Plug.SSL.html#configure/1
  #
  # We also recommend setting `force_ssl` in your config/prod.exs,
  # ensuring no data is ever sent via http, always redirecting to https:
  #
  #     config :opsward_web, OpsWardWeb.Endpoint,
  #       force_ssl: [hsts: true]
  #
  # Check `Plug.SSL` for all available options in `force_ssl`.

  config :opsward, :dns_cluster_query, System.get_env("DNS_CLUSTER_QUERY")
end
