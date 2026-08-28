FROM hexpm/elixir:1.18.4-erlang-27.3.4.16-alpine-3.22.5 AS build

RUN apk add --no-cache build-base cmake git
WORKDIR /app
ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock .formatter.exs ./
COPY config config
COPY apps/opsward/mix.exs apps/opsward/mix.exs
COPY apps/opsward_web/mix.exs apps/opsward_web/mix.exs
RUN mix deps.get --only prod && mix deps.compile

COPY apps apps
RUN mix compile && mix phx.digest && mix release opsward

FROM alpine:3.22 AS runtime

RUN apk add --no-cache libstdc++ ncurses-libs openssl
WORKDIR /app
RUN addgroup -S -g 10001 opsward && \
    adduser -S -D -H -u 10001 -G opsward opsward && \
    mkdir -p /app/data/raft && \
    chown -R opsward:opsward /app/data
COPY --from=build --chown=opsward:opsward /app/_build/prod/rel/opsward ./
COPY --chown=opsward:opsward docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER opsward
ENV HOME=/app LANG=C.UTF-8
EXPOSE 4000 50051
ENTRYPOINT ["./docker-entrypoint.sh"]
