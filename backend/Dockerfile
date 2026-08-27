FROM elixir:1.18-alpine AS build

RUN apk add --no-cache build-base cmake git
WORKDIR /app
ENV MIX_ENV=prod

RUN mix local.hex --force && mix local.rebar --force
COPY mix.exs mix.lock ./
COPY config config
COPY apps/opsward/mix.exs apps/opsward/mix.exs
COPY apps/opsward_web/mix.exs apps/opsward_web/mix.exs
RUN mix deps.get --only prod && mix deps.compile

COPY apps apps
RUN mix compile && mix release opsward

FROM alpine:3.22 AS runtime

RUN apk add --no-cache libstdc++ ncurses-libs openssl
WORKDIR /app
RUN addgroup -S opsward && adduser -S opsward -G opsward
COPY --from=build --chown=opsward:opsward /app/_build/prod/rel/opsward ./
COPY --chown=opsward:opsward docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER opsward
ENV HOME=/app LANG=C.UTF-8
EXPOSE 4000 50051
ENTRYPOINT ["./docker-entrypoint.sh"]
