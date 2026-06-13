# SaaSmint

SaaSmint is a personal SaaS boilerplate — a production-ready **Django + Next.js** starter in one monorepo, with Stripe billing, JWT auth (email/password + OAuth), multi-tenant organizations, and multi-currency pricing. Fork it, plug in your Stripe keys, and start building.

## Packages

- **`core/`** — Django 6 / DRF / Celery / Stripe backend.
- **`app/`** — Next.js 16 / React 19 / Tailwind 4 frontend (strict hexagonal layers).
- **`infra/`** — shared `docker-compose*.yml`, Caddy TLS proxy, nginx, `redis.conf`, deploy scripts, and generated TLS certs.
- **`openspec/`** — spec-driven change workflow: capability specs (`specs/<capability>/`) + change proposals (`changes/`).

## What you get

- **Stripe billing** — subscriptions, one-time products (credit packs), customer portal, and idempotent webhook handling with database-backed deduplication.
- **Auth** — custom Django JWT (access + refresh in HTTP-only cookies), email/password, and OAuth (Google, GitHub, Microsoft) with cross-provider account linking.
- **Organizations** — multi-tenant orgs with role-based membership (owner / admin / member), seat-based team pricing, email invitations, and ownership transfer.
- **Multi-plan catalog** — personal and team plans (basic, pro), plus one-time Boost credit packs.
- **Multi-currency** — USD-only catalog source of truth with daily exchange-rate sync ([open.er-api.com](https://open.er-api.com)) for display in 20+ currencies; Stripe charges in the resolved billing currency.
- **Frontend** — App Router, server actions over a typed gateway/port layer, next-intl i18n, Stripe-hosted checkout, and an atomic-design component library.
- **Admin** — extended Django admin with subscription status, Stripe event log, and user impersonation via django-hijack.
- **Async jobs** — Celery + Redis for email delivery, exchange-rate sync, and webhook processing.
- **Local HTTPS** — bundled Caddy TLS proxy + mkcert workflow, so dev mirrors production over `https://`.
- **Dev seed data** — one command populates realistic test users, orgs, plans, and Stripe products.
- **CI/CD** — path-filtered GitHub Actions for lint / typecheck / tests, plus a tag-driven staging deploy.

## Quick start

```bash
make setup            # install backend (uv) + frontend (pnpm) deps; prints env + TLS setup
# fill in .env.local, generate local TLS certs (mkcert — see "Local HTTPS" below), then:
make dev              # backend + infra in Docker: Postgres, Redis, Django, Celery, Caddy, Stripe CLI
cd app && pnpm dev    # frontend on host
```

Or open **`saasmint.code-workspace`** in VS Code and run the **"Run Everything Local"** build task (`Ctrl+Shift+B`) — it starts the backend stack and the frontend together, and the workspace ships launch configs to debug both (debugpy attaches to the Django container; `next dev --inspect` for the frontend).

- App: `https://localhost:3000` · API (via Caddy): `https://localhost:8443` · Django direct: `http://localhost:8001`

## Environment

One root template, `.env.example` → copy to `.env.local` (`make setup` does this). `NEXT_PUBLIC_*` are **build-time** (baked into the frontend bundle); everything else is backend runtime config. One file per environment, selected by `ENVIRONMENT`: `.env.local` (dev), `.env.staging` (the VPS), `.env.production`.

Boundary values shared across the stack are defined once in `.env.example` (e.g. `FRONTEND_URL` ↔ `NEXT_PUBLIC_APP_URL`, the Caddy `:8443` proxy ↔ `NEXT_PUBLIC_API_URL`, `STRIPE_SECRET_KEY` ↔ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`). Key backend variables:

| Variable | Description |
|---|---|
| `ENVIRONMENT` | Environment name (`local` / `staging` / `production`) — selects which `.env` file to load |
| `DJANGO_SECRET_KEY` | Django secret key |
| `JWT_SIGNING_KEY` | Signing key for access/refresh JWTs (≥ 32 bytes). Keep separate from `DJANGO_SECRET_KEY` so it can rotate independently; falls back to `DJANGO_SECRET_KEY` if unset |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string (defaults to `redis://localhost:6379/0`) |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Postgres container credentials (used by Docker Compose for `${VAR}` interpolation) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API secret + webhook signing secret |
| `BILLING_CURRENCIES` | JSON array of ISO 4217 codes Stripe charges in (e.g. `["usd","eur","gbp"]`); `usd` must always be included. Display-only currencies do not need listing here |
| `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` | [Resend](https://resend.com) transactional email (verification, password reset) |
| `MARKETING_INQUIRIES_TO` | Inbox for landing CTA + Contact submissions. Required at runtime |
| `OAUTH_{GOOGLE,GITHUB,MICROSOFT}_CLIENT_{ID,SECRET}` | OAuth provider credentials (optional) |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA v3 verification; empty (default) disables it for local dev/tests |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_APP_URL` | Frontend build-time URLs (the Caddy API proxy and the app's own URL) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Frontend build-time public keys |

See `.env.example` for the complete, commented list.

## Local HTTPS

The dev stack runs a [Caddy](https://caddyserver.com/) reverse proxy that terminates TLS at `https://localhost:8443` and forwards to Django. This requires a one-time [mkcert](https://github.com/FiloSottile/mkcert) setup per machine.

**Install mkcert (once per machine):**

| Platform | Command |
|---|---|
| macOS | `brew install mkcert` |
| Ubuntu | `sudo apt install mkcert` |
| Windows | `winget install FiloSottile.mkcert` or `choco install mkcert` |

**Generate locally-trusted certs into the shared `infra/certs/`:**

```bash
mkdir -p infra/certs
mkcert -install
mkcert -key-file infra/certs/localhost-key.pem -cert-file infra/certs/localhost.pem localhost
```

`infra/certs/` is gitignored — certs are never committed. Run `make https-setup` at any time to reprint these instructions. The frontend dev server reads the root CA + localhost certs from this same `infra/certs/` directory.

## API documentation

When `DEBUG=True` (or `SCHEMA_PUBLIC=True`), interactive API docs are served at:

- `/api/docs/` — Swagger UI
- `/api/redoc/` — ReDoc
- `/api/schema/` — raw OpenAPI 3 schema

Links to Swagger and ReDoc also appear in the Django admin header (debug only). Regenerate the committed `schema.yml` after changing an endpoint with `make schema`.

## Common commands

| | |
|---|---|
| `make dev` / `make stop` / `make logs` | Docker stack lifecycle |
| `make migrate` · `make seed` · `make schema` | DB migrations · dev seed data · OpenAPI schema |
| `make test` · `make test-core` · `make test-app` | Django · core lib · frontend tests |
| `make lint` · `make typecheck` · `make format` | run across backend **and** frontend |

All Docker Compose targets load the active env file via `--env-file $(ENV_FILE)` (defaults to `.env.local`); override per environment, e.g. `make dev ENV_FILE=.env.staging`.

## Stripe setup

1. Create a [Stripe account](https://dashboard.stripe.com/register) and grab your test API keys from the [dashboard](https://dashboard.stripe.com/apikeys); put them in the env file for your target environment.
2. Start the stack. `core/infra/entrypoint.sh` runs `migrate`, then `seed_catalog` (idempotent — default Plans, PlanPrices, and Boost Products with placeholder Stripe price IDs), then `sync_localized_prices` (recomputes `LocalizedPrice` rows from the FX feed; non-fatal if the upstream is flaky), then `sync_stripe_catalog` (idempotent via Stripe `lookup_key`s — creates/updates Stripe Products/Prices and writes real `stripe_price_id`s back). The order matters: `sync_localized_prices` must run before `sync_stripe_catalog`. No manual steps after deploy; to push catalog edits manually, run `make sync-stripe`.
3. Local webhook forwarding is handled by the bundled `stripe-cli` service in `docker-compose.yml`. Run `stripe login` once on the host (it writes auth to `~/.config/stripe`, mounted read-write into the container), then `make dev` starts the forwarder alongside Django. Tail it with `make stripe-logs`.
4. In production, point a Stripe webhook endpoint at `/api/v1/webhooks/stripe/` for: `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`, and `subscription_schedule.{created,updated,released,canceled,aborted}`.

To change prices, edit the USD source of truth in `core/apps/billing/management/commands/seed_catalog.py`, then re-run the three sync steps (see [core/CLAUDE.md](core/CLAUDE.md) → "Updating prices").

## Deploying

The backend runs anywhere Django runs (Railway, Render, Fly.io, a VPS). The bundled CI deploys both stacks to a **VPS** on a version tag: pushing a `v*` tag triggers `.github/workflows/deploy-staging.yml`, which builds and serves `api.` and `app.` from the flattened `/opt/saasmint` layout via `infra/docker-compose.vps.yml`. Set all environment variables and ensure migrations run on deploy (the entrypoint handles them).

## Tech stack

- **Backend** — Python 3.12, Django 6, DRF, Celery + Redis, PostgreSQL, Stripe, Resend, drf-spectacular, django-hijack, Caddy; `uv` (deps), Ruff (lint), mypy (types), pytest (tests).
- **Frontend** — Next.js 16 (App Router, React 19, Turbopack), Tailwind CSS 4, next-intl, Zod; `pnpm`, ESLint, `tsc`, Vitest.

## History

This repo consolidates the former **`saasmint-core`** (Django) and **`saasmint-app`** (Next.js) repositories, merged with full git history (`git blame` traces to the original commits). Those archived repos hold the pre-merge `v0.x` tags. See [CHANGELOG.md](CHANGELOG.md) for the unified, lockstep-versioned history.

## Plugins

- [Prism](https://github.com/SergiCoder/prism) — Claude Code plugin for multi-profile code review, conventional commits, branching, and PR workflows.

## License

[MIT](LICENSE)
