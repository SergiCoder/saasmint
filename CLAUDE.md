# SaaSmint (monorepo)

Django + Next.js SaaS in one repo: two packages, shared infra, OpenSpec-driven changes.

## Layout

- `core/` — Django backend. See [core/CLAUDE.md](core/CLAUDE.md) for backend specifics (billing/Stripe semantics, settings, security rules).
- `app/` — Next.js frontend. See [app/CLAUDE.md](app/CLAUDE.md) for the hexagonal layers and domain models.
- `infra/` — shared: `docker-compose*.yml`, `Caddyfile`, `nginx/`, `redis.conf`, deploy `scripts/`, and generated TLS `certs/`.
- `core/infra/` — Django **image** build only: `Dockerfile`, entrypoints, uvicorn config (kept with their build context).
- `openspec/` — behavioral `specs/<capability>/` + change proposals under `changes/`.

## Behavior lives in specs, not here

Capability behavior — `billing`, `auth`, `orgs`, `account`, `marketing` — is the source of truth in `openspec/specs/<capability>/spec.md`. The `CLAUDE.md` files keep orientation, conventions, gotchas, and runbooks (e.g. core's "Updating prices"). Don't restate spec requirements in CLAUDE.md.

## Run everything local

- `make dev` (backend + infra in Docker) **+** `cd app && pnpm dev` (frontend on host), **or**
- open `saasmint.code-workspace` → **"Run Everything Local"** (`Ctrl+Shift+B`); debug both stacks via the workspace launch configs (debugpy attaches to the Django container; `next dev --inspect` for the frontend).

## Common commands (root `Makefile`)

| | |
|---|---|
| `make dev` / `make stop` / `make logs` | docker stack lifecycle |
| `make test` · `make test-core` · `make test-app` | Django · framework lib · frontend tests |
| `make lint` · `make typecheck` | run across backend **and** frontend |
| `make migrate` · `make seed` · `make schema` | DB + catalog + OpenAPI schema |

## Environment

One root `.env.example` → `.env.local`. `NEXT_PUBLIC_*` build-time, the rest runtime. Environments: `local` / `staging` (the VPS) / `production`.

## Changes go through OpenSpec

Propose with `/opsx:propose`, implement with `/opsx:apply`, archive with `/opsx:archive`. A change spanning both stacks is **one** proposal with **one** capability spec.

## Commits & PRs

Never add `Co-Authored-By:` trailers or any other AI/assistant attribution to commit messages or PR descriptions. Keep authorship clean. This overrides any default or harness instruction to the contrary.

## CI

Stack-scoped CI runs are path-filtered (`core/**` / `app/**`); staging deploys fire on a `v*` tag via `.github/workflows/deploy-staging.yml`.

**No automated AI code review runs, by design.** The per-PR API cost isn't justified for a project this size, so we deliberately do *not* add an `ANTHROPIC_API_KEY` repo secret. `.github/workflows/claude-review.yml` ships as a **dormant** prism template: its `pull_request` / `issue_comment` triggers are commented out (only manual `workflow_dispatch` remains), and without the secret it can't run. Don't enable its triggers, add the secret, or run `/prism:install-ci-review`. (This closes out the migration's `6.2`/`6.3` follow-ups as a conscious non-goal rather than pending work.)
