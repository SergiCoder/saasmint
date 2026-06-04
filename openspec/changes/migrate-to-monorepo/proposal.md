## Why

`saasmint-core` (Django) and `saasmint-app` (Next.js) are already one product wearing two repos: both sit at `v0.12.0` and release in lockstep, the frontend's `dev` script reaches across the directory boundary to read the backend's TLS certs (`../saasmint-core/infra/certs/...`), and the billing domain semantics are written out — and quietly drifting — in *both* `CLAUDE.md` files. Splitting one vertical feature across two repos means two PRs, two changelogs, and no single source of behavioral truth. Consolidating into one repo gives us a single history, one change per vertical slice, a unified environment-config model, and a clean substrate to adopt OpenSpec and the prism review plugin going forward.

## What Changes

- Merge `saasmint-core` and `saasmint-app` into this repo under `core/` and `app/`, **preserving full git history with `git blame` intact** (via `git filter-repo --to-subdirectory-filter`). The two source repos are retired to read-only afterward.
- Relocate shared infrastructure (TLS certs, Caddy, nginx, compose, entrypoints) to a root `infra/`, and rewire every cross-boundary path (app cert path, Docker build contexts, Dockerfile references).
- **Unify environment configuration** to a single root `.env.example` template that fills `.env.local` (developer machines) and `.env.<environment>` (servers). Retires the inconsistent `.env.base` / `.env.example` / `.env.dev` naming. **BREAKING** — local-dev setup and the deploy pipeline now load configuration from new paths.
- **Rename the deployed environment from the misnamed "dev" to `staging`**: `/opt/saasmint/.env.dev` → `.env.staging`, `deploy-dev.yml` → `deploy-staging.yml`, and the compose/vps-script `env_file` references that point at it.
- **Drop the predecessor repos' overlapping tags** (both own `v0.4.0`/`v0.7.0`/`v0.11.0`/`v0.12.0`) and start a fresh single-version line for the monorepo, cutting **`v1.0.0`** to mark the consolidation.
- Unify CI into path-filtered jobs (Django checks on `core/**`, Next checks on `app/**`) and install the prism CI-review workflow once for the whole repo.

## Capabilities

### New Capabilities
- `repository-structure`: the monorepo layout contract — `core/` (Django) + `app/` (Next.js) + shared root `infra/` + `openspec/` in one git repository, with predecessor history preserved and blame-traceable.
- `environment-config`: the unified configuration model — one root `.env.example` template, the `local`/`staging`/`production` naming spine, the build-time (`NEXT_PUBLIC_*`) vs runtime split, and a single env file per environment shared by all services.

### Modified Capabilities
<!-- None. This change relocates and rewires existing behavior; it does not alter the
     requirements of product capabilities (auth, billing, orgs, account). Those are
     seeded separately as baseline specs. -->

## Impact

- **Code**: `app/package.json` dev script (cert path), `docker-compose.yml` build contexts (`.` → `./core`), `infra/Dockerfile` references, both repos' `.github/workflows/`.
- **Deploy**: VPS env-file rename is a **manual ops step on the server** (not a repo edit) and easy to miss; the `deploy-dev` workflow is renamed and re-pointed; compose `env_file:` paths change.
- **Repos**: `saasmint-core` and `saasmint-app` become archived/read-only; they remain the authoritative record of the old `v0.x` tags.
- **Tooling/deps**: requires `git filter-repo` for the history merge; introduces the prism CI-review workflow + `ANTHROPIC_API_KEY` repo secret.
- **Non-goal**: this change does not retro-spec product behavior (auth/billing/orgs/account) — that is tracked as a separate spec-seeding effort.
