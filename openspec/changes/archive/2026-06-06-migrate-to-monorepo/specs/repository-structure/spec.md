## ADDED Requirements

### Requirement: Unified monorepo layout

The product SHALL live in a single git repository containing the Django backend under `core/`, the Next.js frontend under `app/`, shared infrastructure under a root `infra/`, and OpenSpec artifacts under `openspec/`.

#### Scenario: Backend and frontend coexist in one repo

- **WHEN** a contributor clones the repository
- **THEN** `core/` contains the Django project and `app/` contains the Next.js project
- **AND** shared TLS certs, Caddy/nginx config, compose files, and entrypoint scripts live under the root `infra/`

#### Scenario: A vertical feature spans one repository

- **WHEN** a feature touches both backend and frontend (e.g. billing)
- **THEN** it is expressed as a single change/PR within this repository
- **AND** no cross-repository coordination or lockstep version bump is required

### Requirement: Preserved predecessor history

The migration SHALL preserve the commit history of both predecessor repositories so that `git blame` and `git log` resolve to the original pre-merge commits, with each repository's tree relocated under its target subdirectory (`core/`, `app/`).

#### Scenario: Blame traces to original authorship

- **WHEN** a contributor runs `git blame core/apps/billing/models.py`
- **THEN** each line references the original pre-merge commit that introduced it
- **AND** not a single squashed "import" commit

#### Scenario: Predecessor repos retained as archive

- **WHEN** the merge completes
- **THEN** `saasmint-core` and `saasmint-app` are set read-only and retained as the authoritative record of the pre-merge `v0.x` tags

### Requirement: Single version line

The monorepo SHALL maintain one version line for the combined product, continuing the backend-tracked `0.x` line rather than resetting to a symbolic `v1.0.0`; the predecessor repositories' overlapping per-repo tags SHALL NOT be carried into the new repository.

#### Scenario: Continuous version line at consolidation

- **WHEN** the consolidation is released
- **THEN** the repository is tagged on the continuous `0.x` line tracking the SaaSmint Core backend release (the first monorepo tag is `v0.13.1`), not a symbolic `v1.0.0`
- **AND** all three packages (`saasmint-core`, `saasmint-core-lib`, `saasmint-app`) carry the same version at tag time (lockstep)
- **AND** the overlapping predecessor tags (`v0.4.0`, `v0.7.0`, `v0.11.0`, `v0.12.0`) are absent from this repository's tag list

### Requirement: Local development tooling

The monorepo SHALL provide a consolidated VS Code multi-root workspace (`saasmint.code-workspace`) that lets a developer run the entire local stack (Dockerized backend + infra and the host-run Next.js frontend) from a single action, and debug BOTH the Python backend (debugpy attach to the Django container) and the Node frontend (`next dev`), with Python tooling scoped to `core/.venv` and Node/TypeScript tooling scoped to `app/node_modules`. All file paths SHALL be correct for the post-merge layout (`core/`, `app/`, root `infra/`).

#### Scenario: One action runs the full local stack

- **WHEN** a developer opens `saasmint.code-workspace` and triggers the default build task "Run Everything Local" (Ctrl+Shift+B)
- **THEN** VS Code runs `backend: make dev` (cwd = repo root, `docker compose up --build` -> postgres, redis, django/uvicorn on `:8001`, celery, caddy on `:8443`, stripe-cli; `entrypoint.dev.sh` auto-runs migrate + `seed_dev_data --sync-stripe`) and `frontend: pnpm dev` (cwd = `app/`, `next dev --turbo --experimental-https` on `https://localhost:3000`) in parallel
- **THEN** each background task reports "ready" via its problem matcher instead of hanging, and the frontend reaches the backend through Caddy at `https://localhost:8443`

#### Scenario: Backend is debuggable via debugpy attach

- **WHEN** a developer launches "Backend: attach debugpy (start stack)" or, with a stack already up, "Backend: attach debugpy (already running)"
- **THEN** the Django container runs uvicorn under `debugpy` listening on `5678` WITHOUT `--reload`, and VS Code attaches over `connect 127.0.0.1:5678` with `pathMappings` mapping `core/` to `/app`
- **THEN** breakpoints bind in `core/apps/**`, `core/config/**`, and `core/core/saasmint_core/**`, and the debug task uses a distinct compose project name and stops any running stack first so it does not collide on ports `5678`/`8001`

#### Scenario: Frontend is debuggable on the host

- **WHEN** a developer launches "Frontend: next dev (--inspect)"
- **THEN** `next dev` runs from `app/` with the VS Code node launcher managing the inspector (`autoAttachChildProcesses: true`, no duplicate `--inspect` in `NODE_OPTIONS`), reading TLS certs from `../infra/certs/*.pem` and loading root env via the `dotenv -e ../.env.local` wrapper
- **THEN** server-side breakpoints bind in server components, route handlers, middleware, and next-intl server code, and `serverReadyAction` opens Chrome against `https://localhost:3000` so client-side React breakpoints are also debuggable

#### Scenario: Editor tooling is scoped per language without cross-contamination

- **WHEN** a developer edits a `.py` file under `core/` or a `.ts`/`.tsx` file under `app/`
- **THEN** Python files resolve Pylance/ruff/mypy against `core/.venv/bin/python` with `python.analysis.extraPaths` including both `${workspaceFolder}` and `${workspaceFolder}/core` so every `from saasmint_core...` import resolves
- **THEN** TypeScript files resolve ESLint (flat config), Prettier, the TS SDK, and Vitest against `app/node_modules` with `eslint.workingDirectories` pinned to `app/`, and neither tool leaks into the other folder
