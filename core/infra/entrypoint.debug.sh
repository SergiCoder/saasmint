#!/usr/bin/env bash
set -euo pipefail

if [ "${DJANGO_SETTINGS_MODULE:-}" = "config.settings.dev" ]; then
  echo "==> Running Django migrations..."
  uv run python manage.py migrate --no-input
  echo "==> Seeding dev data and syncing Stripe catalog..."
  uv run python manage.py seed_dev_data --sync-stripe
fi

WAIT=""
[ "${DEBUGPY_WAIT_FOR_CLIENT:-0}" = "1" ] && WAIT="--wait-for-client"

# debugpy is NOT a pyproject dep -> pull it in ephemerally with `uv run --with`.
# No --reload: the reloader child breaks the attach and drops breakpoints.
exec uv run --with debugpy python -m debugpy --listen 0.0.0.0:5678 $WAIT \
  -m uvicorn config.asgi:application --host 0.0.0.0 --port "${DJANGO_PORT:-8001}" \
  --log-config /app/infra/uvicorn-log-config.json
