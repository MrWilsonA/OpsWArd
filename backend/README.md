# OpsWArd Elixir Backend

The backend is a Phoenix 1.8 umbrella running on Elixir/OTP. It provides incident command APIs, a Broadway/Kafka telemetry pipeline with persistent DLQ, Oban-backed saga playbooks, `ra` consensus, Phoenix Presence, LiveKit token issuance, and a gRPC command interface.

## Applications

- `apps/opsward`: Ecto domain, Oban workers, Broadway Kafka ingestion, Raft ledger, gRPC, spatial media policy.
- `apps/opsward_web`: REST API, health/Prometheus endpoints, and multiplayer Phoenix Channel.

## Local development

Elixir 1.17+ and PostgreSQL are required. Kafka, Raft, and gRPC are disabled by default in development so the core API can run independently.

```shell
mix setup
mix phx.server
```

The API listens on `http://localhost:4000`, WebSocket on `/socket`, and gRPC on `50051` when enabled. The complete local platform is started from the repository root:

```shell
docker compose up --build
```

This starts three named Erlang nodes. Only `backend-1` performs migrations; Ecto migration locking still protects deployments where multiple jobs are launched.

## Contracts

- REST: [`openapi.yaml`](openapi.yaml)
- gRPC: [`apps/opsward/priv/proto/opsward.proto`](apps/opsward/priv/proto/opsward.proto)
- Phoenix Channel: connect to `/socket?identity=<responder>` and join `room:<room-id>`. Send `position` with `{x, y}`.

Set `OPSWARD_API_KEY` to require `x-api-key` on all API routes other than health and metrics. Mutating incident requests may provide `x-opsward-actor` for audit attribution.

## Operational behavior

- Telemetry is idempotent by `event_id`; Kafka partition keys preserve per-source ordering.
- Invalid Kafka messages are persisted in `dlq_entries` and also published to the DLQ topic.
- Playbooks use forward steps and reverse compensation jobs. Pass `context.fail_step` in non-production testing to exercise rollback.
- Raft mutations require a majority when enabled. The local ledger is an explicit development fallback, not a claim of distributed durability.
- LiveKit tokens are short-lived HS256 JWTs scoped to one room and identity.

## Verification

```shell
mix precommit
```

The CI workflow also validates migrations against PostgreSQL, compiles with warnings as errors, tests, checks formatting, validates Compose and lints the Helm chart.
