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

### D3 — Drop predecessor tags; continue the single lockstep version line

Both repos own `v0.4.0`/`v0.7.0`/`v0.11.0`/`v0.12.0` — they would collide on merge.

- **Why:** The archived repos retain all old tags as the historical record, so nothing is lost; carrying namespaced `core/v*` / `app/v*` ghosts would clutter `git tag` forever. The product already ships lockstep, so one version line matches reality.
- **Refined during apply:** the consolidation ships as **`v0.13.0`**, *not* `v1.0.0`. The merge changed no application behavior, and `CHANGELOG.md` codifies the policy "version numbers track the SaaSmint Core backend release." A symbolic `1.0` would contradict that policy, so the continuous `0.x` line carries forward and `v0.13.0` becomes the first monorepo tag.

### D4 — Shared infra at root `infra/`; rewire the one hard-coded cross-boundary path

Certs, Caddyfile, nginx, entrypoints, and compose move to root `infra/`. The app dev cert path `../saasmint-core/infra/certs` becomes `../infra/certs`; Docker build context for the backend becomes `./core`.

- **Refined during apply:** the Django **Dockerfile + entrypoints + uvicorn config stay under `core/infra/`** (they need the image build context); only the shared/orchestration assets (certs, Caddyfile, nginx, redis.conf, compose files, deploy scripts) move to root `infra/`. The root `Makefile` runs docker targets at root and Python/Node targets scoped into `core/` and `app/`.

### D5 — Single root env file per environment (mirror what staging already does)

One committed `.env.example` at root, sectioned `# core` / `# app`, copied to `.env.local` (dev) and `.env.<environment>` on each server. `NEXT_PUBLIC_*` remain build args; runtime vars flow via `env_file`. `next dev` is wrapped to load root `.env.local` (`dotenv -e ../.env.local -- next dev …`).

- **Why:** Staging already proves a single unified env file works; local dev is the only fragmented part. One file kills the drift on boundary values typed twice today (`FRONTEND_URL` ↔ `NEXT_PUBLIC_APP_URL`, the Stripe `sk`/`pk` pair, the reCAPTCHA secret/site-key pair).
- **Alternatives:** *Per-package `.env.local`* (rejected: native tool loading, but boundary vars stay duplicated — the exact problem). *Layered shared+package* (rejected: most moving parts, needs an assembly step). The single-file cost is one `dotenv` wrapper for `next dev`.

### D6 — Rename the deployed environment `dev` → `staging`

`/opt/saasmint/.env.dev` → `.env.staging`; `deploy-dev.yml` → `deploy-staging.yml`; compose `env_file:` and `vps.sh` `ENV_FILE` re-pointed; compose `:?... must be set in .env.dev` messages updated.

- **Why:** The live server is currently labeled "dev", a latent footgun. `staging` reflects reality and reserves `production` for a future prod box.

### D7 — Unified CI with path filters + one prism CI-review workflow

Django checks run on `core/**`, Next checks on `app/**`, via `paths:` filters. The two predecessor deploy workflows merge into `deploy-staging.yml`. `prism:install-ci-review` installs the review workflow once for the whole repo.

### D8 — Consolidated VS Code workspace for full local run

**Decision.** Adopt a **multi-root `.code-workspace`** at the monorepo root (`saasmint.code-workspace`) declaring three folders — `core` (Django), `app` (Next.js), and `root` (`.`, for shared `infra/`) — as the single home for the **shared** launch configs, compounds, and tasks, with **per-folder editor tooling** in `core/.vscode/settings.json` (Python -> `core/.venv`) and `app/.vscode/settings.json` (ESLint/Prettier/TS/Vitest -> `app/node_modules`). Backend debugging uses a **debugpy-over-compose override** (`infra/docker-compose.debug.yml` + `core/infra/entrypoint.debug.sh`).

**Why this model.**
- A multi-root workspace is the only model where a **compound** launch and a **`dependsOrder: parallel`** build task can span *both* folders — two separate per-folder `launch.json` files cannot reference each other. This is what makes "one action runs everything" and "one F5 debugs both" possible.
- Per-folder `settings.json` gives clean, idiomatic polyglot scoping: Python tooling (Pylance/ruff/mypy) resolves against `core/` with **zero** ESLint/TS leakage into `core/`, and Node tooling resolves against `app/node_modules` with no Python leakage into `app/`.
- It honors the real, locked topology: backend + infra stay in Docker (`make dev`, uvicorn `--reload`, auto migrate/seed/sync-stripe), frontend stays on host (fast Turbopack HMR + host TLS). Nothing is re-architected.

**Alternatives rejected.**
- *Single-root `.vscode/` at the monorepo root.* One interpreter/one ESLint working dir for the whole repo forces brittle per-glob overrides and cross-contaminates Python and Node tooling. Rejected for tooling-scope hygiene — but its good ideas were grafted in (pytest Test Explorer, `files.watcherExclude`, explicitly pinned ruff/mypy interpreter, a browser-attach config).
- *Docker-first (add an `app` service, debug everything in containers).* Kills Turbopack HMR speed and host-TLS simplicity for the frontend. Rejected as the default — but kept as an **opt-in compose `profile: [full-docker]`** for occasional full-parity runs, and its hardening ideas were grafted (pin attach hosts to `127.0.0.1`, `restart: true` on attach configs, a non-`--wait-for-client` debug boot).

**How "run everything" works (one action).** The default build task **"Run Everything Local"** (`Ctrl+Shift+B`) has `dependsOrder: parallel` over two background tasks:
1. **`backend: make dev`** (cwd = `root`) -> `make dev` => `docker compose up --build` brings up postgres/redis/django-uvicorn:8001/celery/caddy:8443/stripe-cli; `entrypoint.dev.sh` auto-runs `migrate` + `seed_dev_data --sync-stripe` under `config.settings.dev`.
2. **`frontend: pnpm dev`** (cwd = `app`) -> `pnpm dev` => `next dev --turbo --experimental-https` on `https://localhost:3000`.

Each task is `isBackground` with a **background problemMatcher** (`beginsPattern`/`endsPattern`) so VS Code reports "ready" instead of spinning forever; the umbrella task then completes cleanly. Cert paths are post-merge-correct (`../infra/certs/*.pem` from `app/`), and the frontend loads root env via a **real** `dotenv-cli` wrapper (see env note below).

**The debug story.**
- **Backend (attach debugpy to the container).** `make dev` runs uvicorn with `--reload`, which is hostile to a stable attach (the reloader forks a child the debugger can't follow; breakpoints vanish on restart). So debugging uses a dedicated path: launch **"Backend: attach debugpy (start stack)"** has `preLaunchTask: "backend: make dev (debugpy)"`, which runs `docker compose -p saasmint-debug -f docker-compose.yml -f infra/docker-compose.debug.yml up --build` **after a `down`** of any running stack, so it cannot collide on `5678`/`8001` with a plain `make dev`. The override swaps the entrypoint to `entrypoint.debug.sh` (still migrate + seed under `config.settings.dev`) and runs `uv run --with debugpy python -m debugpy --listen 0.0.0.0:5678 -m uvicorn config.asgi:application ... --port 8001` **without `--reload`**, publishing `5678`. `debugpy` is injected ephemerally via `uv run --with` (it is not a pyproject dep, so production is untouched). VS Code attaches over `connect 127.0.0.1:5678` (not `localhost`, to dodge IPv6 flakiness) with `pathMappings localRoot=core <-> remoteRoot=/app` and `django: true`; breakpoints in `core/apps/**`, `core/config/**`, `core/core/saasmint_core/**`, DRF views and Celery-invoked code all bind, and `justMyCode: false` steps into Django/DRF. A **standalone** **"Backend: attach debugpy (already running)"** config (no `preLaunchTask`, `connect 127.0.0.1:5678`) covers the common "stack already up, attach now" workflow.
- **Frontend (Node `next dev`).** Launch **"Frontend: next dev (--inspect)"** runs `pnpm exec dotenv -e ../.env.local -- next dev --turbo --experimental-https ...` from `app/` as a `type: node` launch with `autoAttachChildProcesses: true`; the VS Code launcher manages the inspector itself (we do **not** add `--inspect` to `NODE_OPTIONS`, which would double-open the inspector and fight for `9229`). Breakpoints bind in server components, route handlers, middleware, and next-intl server code. `serverReadyAction` with `action: debugWithChrome` auto-launches Chrome against `https://localhost:3000` so **client-side React breakpoints are also covered**. A companion **"Frontend: attach to running next dev"** (`attach 9229`, `restart: true`) survives Turbopack restarts.
- **Both at once.** Compound **"Run Everything Local (debug both)"** starts the backend debugpy attach (its `preLaunchTask` brings up the debug stack) plus the frontend `--inspect` launch, with `stopAll: true` so stopping one tears down both.

Concrete file contents for all of the above (workspace file, per-folder settings, debug compose override, debug entrypoint) live in [`vscode-config-reference.md`](./vscode-config-reference.md).

### D9 — Staging deploy under the monorepo: flat checkout + restored `app` service

**Discovered during apply** (PR #5), when wiring the live staging VPS — host nginx fronting `api.saasmint.net`→`:8001` and `app.saasmint.net`→`:3000` — to the monorepo:

- **Flat checkout.** The monorepo is cloned **flat at `/opt/saasmint`** (the repo root *is* the deploy dir), not a nested `/opt/saasmint/saasmint`. `deploy-staging.yml` (`cd /opt/saasmint`) and `bootstrap-vps.sh` are aligned to this. The repo is cloned **as the `deploy` user** so `git checkout` during deploys never trips Git's "dubious ownership" guard on a root-owned tree.
- **`app` service restored to the VPS compose.** The merge left `infra/docker-compose.vps.yml` backend-only, so the monorepo could not serve `app.saasmint.net`. The Next.js `app` service is added back (build context `../app`, `NEXT_PUBLIC_*` build args, `:3000`), mirroring the proven predecessor config. This **restores** the existing two-domain topology under one repo — not a topology change (consistent with the Non-Goals). The deploy health check now gates on both `:8001` and `:3000`.
- **Cutover ordering.** The monorepo backend reuses compose project name `infra` (and volume `infra_postgres_data`) → DB continuity across the cutover. The old `saasmint-app` project must be stopped first to free `:3000` before the monorepo `app` service can bind it.

## Risks / Trade-offs

- **Tag collision on merge** → handled by D3 (drop predecessor tags before fetching).
- **The VPS env-file rename is a manual ops step, not a repo edit** → easy to forget and would break the next deploy. Mitigation: call it out as an explicit task and sequence it *before* the first post-merge deploy.
- **History merge ≠ "it boots"** → the merge only guarantees blame; every cross-boundary path (cert path, Docker contexts, CI) must be rewired separately. Mitigation: tasks split "merge history" from "make it run", with a full local + staging smoke test as the gate.
- **`next dev` fights Next's native `app/.env.local` loading** → mitigated by the `dotenv` wrapper (D5); documented in `app/CLAUDE.md`.
- **Rollback:** the predecessor repos remain intact and read-only; until `v0.13.0` is cut and staging is re-pointed, reverting is "keep deploying the old repos."

## Migration Plan

1. Scaffold the monorepo root commit (existing `openspec/`, `.claude/`, `.opencode/`).
2. `filter-repo` both clones into `core/` / `app/` subdirs (drop tags); merge both with `--allow-unrelated-histories`.
3. Move shared infra to root `infra/`; rewire paths (D4) and the env scheme (D5).
4. Apply the `dev`→`staging` rename ripple (D6), including the manual server-side `mv`.
5. Unify CI + install prism review (D7).
6. Smoke test: local stack up, `next dev` over HTTPS, then a staging deploy from the new repo.
7. Cut `v0.13.0`; set predecessor repos read-only.

## Open Questions

- Optional polish: rename `config.settings.dev` → `config.settings.local` so the Django settings module name matches the env spine (touches code; deferrable).
- Confirm `CLAUDE.md` division of labor (behavior → specs, runbooks/gotchas → CLAUDE.md) before the separate spec-seeding effort begins.
- ~~Host `next dev` vs a dockerized `app` service for local parity.~~ **Resolved (D8):** keep `next dev` on host as the default; add a containerized `app` only as an opt-in `full-docker` compose profile, to preserve Turbopack HMR + host TLS and avoid the localhost-in-container SSR trap.
