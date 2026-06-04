## Context

Two mature, lockstep-versioned repositories implement one product:

- `saasmint-core` — Django 6 / DRF / Celery / Postgres / Redis / Stripe. 388 commits, 8 tags, deployed at `api.saasmint.net`. Solo author.
- `saasmint-app` — Next.js 16 / React 19 / next-intl, hexagonal layering. 314 commits, 4 tags, deployed at `app.saasmint.net`. Solo author.

Both sit at `v0.12.0` and ship together. They are already physically coupled — `app/package.json`'s `dev` script reads `../saasmint-core/infra/certs/*.pem` — and the staging VPS already loads a *single* shared env file (`/opt/saasmint/.env.dev`) for `django`, `celery`, and `app`. Local development is the outlier: two separate `.env.local` files plus two different template names (`.env.base` vs `.env.example`). Billing semantics are documented in both `CLAUDE.md` files and drifting.

Constraints: single maintainer; `main == dev` in both repos (0 commits apart); neither repo tracks build junk (`.gitignore` is clean); the staging env file lives only on the server, never in git.

## Goals / Non-Goals

**Goals:**

- One git repository with `core/` + `app/` + shared root `infra/`, history preserved with `git blame` intact.
- A single, consistent environment-config model spanning local and deployed environments.
- A clean substrate for OpenSpec (one change per vertical slice) and the prism review plugin (one CI workflow, diff-driven stack detection).

**Non-Goals:**

- Retro-speccing product behavior (auth/billing/orgs/account) — tracked separately as baseline spec seeding.
- Changing application behavior, the deployment topology (two domains, two images), or the Stripe/billing logic.
- Introducing a workspace/monorepo build tool (Nx, Turborepo). Packages stay independently built with `uv` and `pnpm`.

## Decisions

### D1 — Preserve history via `git filter-repo --to-subdirectory-filter`

Rewrite each predecessor's history so its tree was "always" under `core/` / `app/`, then merge both into the new repo with `--allow-unrelated-histories`. Work on clones; never touch the originals.

- **Why:** `git blame`/`git log` resolve cleanly to original commits with no rename hop. The commit trail is the design rationale for the billing engine — the highest-value thing to keep.
- **Alternatives:** *Fresh `git init`* (rejected: blame dies at an "import" commit — too costly for code this intricate). *`git subtree add`* (rejected: keeps old paths in historical commits, making cross-merge `--follow` finicky). Since the predecessor repos are retired, filter-repo's SHA rewrite is harmless.

### D2 — Directory names `core/` and `app/`

- **Why:** Matches every existing `CLAUDE.md` header and the names get baked permanently into the rewritten history; renaming later costs a rename hop in every blame. `apps/api` + `apps/web` buys nothing without a third package.

### D3 — Drop predecessor tags; fresh single-version line at `v1.0.0`

Both repos own `v0.4.0`/`v0.7.0`/`v0.11.0`/`v0.12.0` — they would collide on merge.

- **Why:** The archived repos retain all old tags as the historical record, so nothing is lost; carrying namespaced `core/v*` / `app/v*` ghosts would clutter `git tag` forever. The product already ships lockstep, so one version line matches reality; `v1.0.0` marks the consolidation.

### D4 — Shared infra at root `infra/`; rewire the one hard-coded cross-boundary path

Certs, Caddyfile, nginx, entrypoints, and compose move to root `infra/`. The app dev cert path `../saasmint-core/infra/certs` becomes `../infra/certs`; Docker build context for the backend becomes `./core`.

### D5 — Single root env file per environment (mirror what staging already does)

One committed `.env.example` at root, sectioned `# core` / `# app`, copied to `.env.local` (dev) and `.env.<environment>` on each server. `NEXT_PUBLIC_*` remain build args; runtime vars flow via `env_file`. `next dev` is wrapped to load root `.env.local` (`dotenv -e ../.env.local -- next dev …`).

- **Why:** Staging already proves a single unified env file works; local dev is the only fragmented part. One file kills the drift on boundary values typed twice today (`FRONTEND_URL` ↔ `NEXT_PUBLIC_APP_URL`, the Stripe `sk`/`pk` pair, the reCAPTCHA secret/site-key pair).
- **Alternatives:** *Per-package `.env.local`* (rejected: native tool loading, but boundary vars stay duplicated — the exact problem). *Layered shared+package* (rejected: most moving parts, needs an assembly step). The single-file cost is one `dotenv` wrapper for `next dev`.

### D6 — Rename the deployed environment `dev` → `staging`

`/opt/saasmint/.env.dev` → `.env.staging`; `deploy-dev.yml` → `deploy-staging.yml`; compose `env_file:` and `vps.sh` `ENV_FILE` re-pointed; compose `:?... must be set in .env.dev` messages updated.

- **Why:** The live server is currently labeled "dev", a latent footgun. `staging` reflects reality and reserves `production` for a future prod box.

### D7 — Unified CI with path filters + one prism CI-review workflow

Django checks run on `core/**`, Next checks on `app/**`, via `paths:` filters. The two predecessor deploy workflows merge into `deploy-staging.yml`. `prism:install-ci-review` installs the review workflow once for the whole repo.

## Risks / Trade-offs

- **Tag collision on merge** → handled by D3 (drop predecessor tags before fetching).
- **The VPS env-file rename is a manual ops step, not a repo edit** → easy to forget and would break the next deploy. Mitigation: call it out as an explicit task and sequence it *before* the first post-merge deploy.
- **History merge ≠ "it boots"** → the merge only guarantees blame; every cross-boundary path (cert path, Docker contexts, CI) must be rewired separately. Mitigation: tasks split "merge history" from "make it run", with a full local + staging smoke test as the gate.
- **`next dev` fights Next's native `app/.env.local` loading** → mitigated by the `dotenv` wrapper (D5); documented in `app/CLAUDE.md`.
- **Rollback:** the predecessor repos remain intact and read-only; until `v1.0.0` is cut and staging is re-pointed, reverting is "keep deploying the old repos."

## Migration Plan

1. Scaffold the monorepo root commit (existing `openspec/`, `.claude/`, `.opencode/`).
2. `filter-repo` both clones into `core/` / `app/` subdirs (drop tags); merge both with `--allow-unrelated-histories`.
3. Move shared infra to root `infra/`; rewire paths (D4) and the env scheme (D5).
4. Apply the `dev`→`staging` rename ripple (D6), including the manual server-side `mv`.
5. Unify CI + install prism review (D7).
6. Smoke test: local stack up, `next dev` over HTTPS, then a staging deploy from the new repo.
7. Cut `v1.0.0`; set predecessor repos read-only.

## Open Questions

- Optional polish: rename `config.settings.dev` → `config.settings.local` so the Django settings module name matches the env spine (touches code; deferrable).
- Confirm `CLAUDE.md` division of labor (behavior → specs, runbooks/gotchas → CLAUDE.md) before the separate spec-seeding effort begins.
- Single root `docker-compose.yml` adding the `app` service for full local parity, or keep the app on host `next dev`? (Affects whether local mirrors staging 1:1.)
