## 1. Prepare the merge (work on clones — never touch the originals)

- [x] 1.1 Install `git filter-repo` and confirm `git filter-repo --version` runs
- [x] 1.2 Clone `saasmint-core` to a scratch dir; `git filter-repo --to-subdirectory-filter core` and strip all tags
- [x] 1.3 Clone `saasmint-app` to a scratch dir; `git filter-repo --to-subdirectory-filter app` and strip all tags
- [x] 1.4 In `saasmint/`, `git init` and commit the existing scaffolding (`openspec/`, `.claude/`, `.opencode/`) as the root commit

## 2. Merge histories

- [x] 2.1 Add the rewritten core clone as a remote, fetch, and `git merge --allow-unrelated-histories` (brings `core/`)
- [x] 2.2 Add the rewritten app clone as a remote, fetch, and `git merge --allow-unrelated-histories` (brings `app/`)
- [x] 2.3 Verify `git blame core/apps/billing/models.py` resolves to original pre-merge commits (not a squash)
- [x] 2.4 Verify `git blame app/src/domain/...` resolves to original frontend commits
- [x] 2.5 Remove the temporary remotes

## 3. Relocate shared infra and rewire cross-boundary paths

- [x] 3.1 Move shared infra (certs, Caddyfile, nginx, entrypoints) from `core/infra/` to root `infra/`
- [x] 3.2 Update `app/package.json` dev script cert path `../saasmint-core/infra/certs` → `../infra/certs`
- [x] 3.3 Update `docker-compose.yml` build context `.` → `./core` and Dockerfile path references
- [x] 3.4 Update any remaining `saasmint-core` / `saasmint-app` path references across both packages

## 4. Unify environment configuration

- [x] 4.1 Create one root `.env.example`, sectioned `# core` / `# app`, covering every var from both old templates
- [x] 4.2 Note derived/boundary vars once (e.g. `FRONTEND_URL` == `NEXT_PUBLIC_APP_URL`); remove `core/.env.base` and `app/.env.example`
- [x] 4.3 Point root `docker-compose.yml` at root `.env.local`; pass `NEXT_PUBLIC_*` to the app build as args
- [x] 4.4 Wrap `next dev` to load root config: `dotenv -e ../.env.local -- next dev …`
- [x] 4.5 Update root `.gitignore` to ignore `.env.local` / `.env.staging` / `.env.production` and commit only `.env.example`
- [ ] 4.6 Verify locally: `next dev` over HTTPS picks up `NEXT_PUBLIC_*` from root `.env.local`

## 5. Rename the deployed environment `dev` → `staging` (the ripple)

- [x] 5.1 `infra/docker-compose.vps.yml`: `env_file` `.env.dev` → `.env.staging` (both services) and update `:?... must be set in .env.dev` messages
- [x] 5.2 `infra/scripts/vps.sh`: `ENV_FILE` → `/opt/saasmint/.env.staging`
- [x] 5.3 Rename workflow `deploy-dev.yml` → `deploy-staging.yml` and re-point its `source /opt/saasmint/.env.dev`
- [x] 5.4 **Manual ops step on the VPS:** `/opt/saasmint/.env.staging` now exists (created fresh from the template; `deploy`-readable, 33/33 keys matching `.env.example`). Legacy `.env.dev` left in place until cutover.
- [x] 5.5 Grep the repo for any remaining `.env.dev` / `deploy-dev` references; expect zero

## 6. Unify CI and install prism review

- [x] 6.1 Merge both repos' `.github/workflows/` into one set with `paths:` filters (`core/**` → Django checks, `app/**` → Next checks)
- [ ] 6.2 Run `/prism:install-ci-review` once for the repo and add `ANTHROPIC_API_KEY` as a repo secret
- [ ] 6.3 Open a throwaway PR touching both `core/` and `app/`; confirm both stacks' checks + prism review fire

## 7. Smoke test and verify

- [ ] 7.1 Full local stack up via root compose (postgres, redis, django, celery, caddy) with no path errors
- [ ] 7.2 `make lint`, `make typecheck`, `make test` (core) and `pnpm lint`, `pnpm typecheck`, `pnpm test` (app) all pass
- [ ] 7.3 Deploy to staging from the new repo; confirm `.env.staging` is loaded and `api`/`app` come up healthy

## 8. Cut over and finalize

- [ ] 8.1 Tag the monorepo `v0.13.0` (not `v1.0.0` — see design D3; the tag must point at a commit that includes PR #5's deploy fixes)
- [ ] 8.2 Set `saasmint-core` and `saasmint-app` to read-only/archived on the remote
- [x] 8.3 Update root `README.md` + `CLAUDE.md` to point at the new layout and reference the archived repos for pre-merge history

## 9. VS Code workspace for local dev

- [x] 9.1 Create `saasmint.code-workspace` at the monorepo root with three folders named `core` (path `core`), `app` (path `app`), `root` (path `.`). Use slash/space-free folder names so every `${workspaceFolder:NAME}` token matches byte-for-byte.
- [x] 9.2 In the workspace `settings` key, set `python.defaultInterpreterPath = "${workspaceFolder:core}/.venv/bin/python"`, `python.terminal.activateEnvironment = false`, `search.exclude` (`**/.next`, `**/.venv`, `**/node_modules`, `**/staticfiles`), `files.exclude` to hide `core`/`app` under the `.` root view, and `files.associations` for dotenv. Do NOT put `eslint.workingDirectories` here (it lives once in `app/.vscode/settings.json`).
- [x] 9.3 In the workspace `extensions.recommendations` key, list: `ms-python.python`, `ms-python.vscode-pylance`, `ms-python.debugpy`, `charliermarsh.ruff`, `ms-python.mypy-type-checker`, `batisteo.vscode-django`, `ms-azuretools.vscode-docker`, `dbaeumer.vscode-eslint`, `esbenp.prettier-vscode`, `vitest.explorer`, `bradlc.vscode-tailwindcss`, `mikestead.dotenv` (no standalone `extensions.json` needed).
- [x] 9.4 Create `core/.vscode/settings.json`: interpreter `${workspaceFolder}/.venv/bin/python`; `python.analysis.extraPaths = ["${workspaceFolder}", "${workspaceFolder}/core"]` (BLOCKER FIX — `saasmint_core` lives at `core/core/`); pin `ruff.interpreter` and `mypy-type-checker.interpreter` to `${workspaceFolder}/.venv/bin/python`; `ruff.importStrategy`/`mypy-type-checker.importStrategy = "fromEnvironment"`; do NOT hardcode `ruff.configuration` (let ruff auto-discover `core/core/pyproject.toml` for the lib); set `mypy-type-checker.cwd = "${workspaceFolder}"`; add `python.testing` (pytestEnabled, `cwd=${workspaceFolder}`, args `["-c", "pyproject.toml"]`); add `files.watcherExclude` for `**/.venv/**`, `**/staticfiles/**`, `**/media/**`, `**/.mypy_cache/**`, `**/.ruff_cache/**`, `**/.pytest_cache/**`; `[python]` formatter = ruff with organize/fixAll on save.
- [x] 9.5 Create `app/.vscode/settings.json`: `eslint.workingDirectories = [{ "mode": "location" }]` (SINGLE definition — none in the workspace file); `prettier.prettierPath`, `typescript.tsdk`, `vitest.rootConfig` -> `${workspaceFolder}/node_modules` / `${workspaceFolder}/vitest.config.ts`; `npm.packageManager = "pnpm"`; `files.watcherExclude` for `**/.next/**`, `**/.turbo/**`, `**/node_modules/**`; `[typescript]`/`[typescriptreact]`/`[javascript]`/`[json]` formatter = prettier, eslint fixAll on save.
- [x] 9.6 Add the `tasks` key (v2.0.0) to the workspace file: umbrella `Run Everything Local` (default build, `dependsOrder: parallel`, dependsOn `backend: make dev` + `frontend: pnpm dev`); `backend: make dev` (cwd `${workspaceFolder:root}`, background problemMatcher); `frontend: pnpm dev` (cwd `${workspaceFolder:app}`, background problemMatcher, endsPattern `Ready in`); `backend: make dev (debugpy)` (runs `make stop` then `docker compose -p saasmint-debug -f docker-compose.yml -f infra/docker-compose.debug.yml up --build` from `${workspaceFolder:root}`); `backend: stop`.
- [x] 9.7 Add the `launch` key (v0.2.0) to the workspace file with: `Frontend: next dev (--inspect)` (cwd `${workspaceFolder:app}`, `runtimeExecutable: pnpm`, dotenv-cli wrapper, `autoAttachChildProcesses: true`, NO `--inspect` in `NODE_OPTIONS`, `serverReadyAction` -> `debugWithChrome`); `Frontend: attach to running next dev` (`attach 9229`, `restart: true`); `Backend: attach debugpy (start stack)` (`connect 127.0.0.1:5678`, `preLaunchTask: backend: make dev (debugpy)`); `Backend: attach debugpy (already running)` (`connect 127.0.0.1:5678`, no preLaunchTask); compound `Run Everything Local (debug both)` (`stopAll: true`).
- [x] 9.8 Create `infra/docker-compose.debug.yml`: override `django` entrypoint to `["/app/infra/entrypoint.debug.sh"]`, publish `["8001:8001", "5678:5678"]`, set `DEBUGPY_WAIT_FOR_CLIENT: "0"`.
- [x] 9.9 Create `core/infra/entrypoint.debug.sh` (bind-mounted to `/app/infra`): run `migrate` + `seed_dev_data --sync-stripe` only under `config.settings.dev`; gate `--wait-for-client` behind `DEBUGPY_WAIT_FOR_CLIENT`; `exec uv run --with debugpy python -m debugpy --listen 0.0.0.0:5678 $WAIT -m uvicorn config.asgi:application --host 0.0.0.0 --port "${DJANGO_PORT:-8001}" --log-config /app/infra/uvicorn-log-config.json` (NO `--reload`). `chmod +x` it.
- [x] 9.10 PATH FIX — certs: in `app/package.json` `dev` script AND the launch config, replace all `../saasmint-core/infra/certs/...` with `../infra/certs/...` (3 cert flags + `NODE_EXTRA_CA_CERTS`). Verify `infra/certs/{localhost-key.pem,localhost.pem,rootCA.pem}` exist post-merge.
- [x] 9.11 ENV FIX — add `dotenv-cli` to `app/devDependencies`; rewrite `app/package.json` `dev` to `dotenv -e ../.env.local -- next dev --turbo --experimental-https ...`. Keep the frontend env file scoped to `NEXT_PUBLIC_*` ONLY — do NOT feed the full backend secret set (`DJANGO_SECRET_KEY`/`STRIPE_SECRET_KEY`/`OAUTH_*_CLIENT_SECRET`/`RESEND_API_KEY`/`RECAPTCHA_SECRET_KEY`) into the Next process. Remove any inert `DOTENV_CONFIG_PATH`.
- [x] 9.12 Delete the superseded per-repo files `core/.vscode/launch.json` and `app/.vscode/launch.json` (the workspace file owns shared launch/tasks now).
- [ ] 9.13 (Opt-in) Add a `full-docker` compose `profile` for a containerized `app` dev service (the app already has a multi-stage Dockerfile) so full parity is available on demand without being the default; if used, point server-side base URLs at `caddy:8443` / a service-name env to avoid the localhost-in-container SSR trap.
- [ ] 9.14 VERIFY: `Ctrl+Shift+B` runs `Run Everything Local` and both tasks reach "ready" (Caddy `https://localhost:8443`, Next `https://localhost:3000`); breakpoints bind in `core/apps/**`, `core/config/**`, and `core/core/saasmint_core/**` via the debugpy attach (no port collision with a separately-running `make dev`); the frontend `--inspect` launch binds server-side breakpoints and `debugWithChrome` covers client-side; `Run Everything Local (debug both)` brings up both with `stopAll`; Pylance shows no unresolved `from saasmint_core...` imports; pytest Test Explorer discovers `core/tests` + `apps/**/tests`.

## 10. Staging deploy wiring (discovered during apply — PR #5, design D9)

- [x] 10.1 Set GitHub deploy secrets on `SergiCoder/saasmint`: `VPS_HOST`, `VPS_PORT`, `VPS_SSH_KEY` (key verified to authenticate as `deploy` and present in `authorized_keys`)
- [x] 10.2 Clone the monorepo **flat** at `/opt/saasmint` (not nested) and `chown -R deploy:deploy` so deploy-time `git checkout` doesn't hit Git's "dubious ownership" guard
- [x] 10.3 `deploy-staging.yml`: `cd /opt/saasmint` (was `/opt/saasmint/saasmint`); gate success on both api (`:8001`) and app (`:3000`) health
- [x] 10.4 `infra/docker-compose.vps.yml`: add the Next.js `app` service (`../app` context, `NEXT_PUBLIC_*` build args, `:3000`) — restores `app.saasmint.net` under the monorepo
- [x] 10.5 `bootstrap-vps.sh`: clone the monorepo flat as the `deploy` user, seed `.env.staging` from `.env.example`, fix the `v*` tag instruction (was `dev-v0.1.0`)
- [x] 10.6 Remove orphaned `app/.github/workflows/deploy-dev.yml` (GitHub only reads root `.github/`)
- [ ] 10.7 Merge PR #5 into `dev` → `main` so the release tag includes the deploy fixes
- [ ] 10.8 **Cutover, in order:** `docker compose -p saasmint-app down` on the VPS (frees `:3000`) → push `v0.13.0` → backend recreates as project `infra` reusing `infra_postgres_data` (DB intact) and `app` builds & serves `:3000` (this is the concrete form of 7.3)
- [ ] 10.9 Verify `api.saasmint.net` + `app.saasmint.net` healthy, then `docker compose down` (no `-v`) + `rm -rf` the old `/opt/saasmint/saasmint-core` and `saasmint-app` clones (feeds 8.2)
