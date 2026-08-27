#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  bin/opsward eval "OpsWard.Release.migrate()"
fi

exec bin/opsward start
