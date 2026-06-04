## 1. Prepare the merge (work on clones — never touch the originals)

- [ ] 1.1 Install `git filter-repo` and confirm `git filter-repo --version` runs
- [ ] 1.2 Clone `saasmint-core` to a scratch dir; `git filter-repo --to-subdirectory-filter core` and strip all tags
- [ ] 1.3 Clone `saasmint-app` to a scratch dir; `git filter-repo --to-subdirectory-filter app` and strip all tags
- [ ] 1.4 In `saasmint/`, `git init` and commit the existing scaffolding (`openspec/`, `.claude/`, `.opencode/`) as the root commit

## 2. Merge histories

- [ ] 2.1 Add the rewritten core clone as a remote, fetch, and `git merge --allow-unrelated-histories` (brings `core/`)
- [ ] 2.2 Add the rewritten app clone as a remote, fetch, and `git merge --allow-unrelated-histories` (brings `app/`)
- [ ] 2.3 Verify `git blame core/apps/billing/models.py` resolves to original pre-merge commits (not a squash)
- [ ] 2.4 Verify `git blame app/src/domain/...` resolves to original frontend commits
- [ ] 2.5 Remove the temporary remotes

## 3. Relocate shared infra and rewire cross-boundary paths

- [ ] 3.1 Move shared infra (certs, Caddyfile, nginx, entrypoints) from `core/infra/` to root `infra/`
- [ ] 3.2 Update `app/package.json` dev script cert path `../saasmint-core/infra/certs` → `../infra/certs`
- [ ] 3.3 Update `docker-compose.yml` build context `.` → `./core` and Dockerfile path references
- [ ] 3.4 Update any remaining `saasmint-core` / `saasmint-app` path references across both packages

## 4. Unify environment configuration

- [ ] 4.1 Create one root `.env.example`, sectioned `# core` / `# app`, covering every var from both old templates
- [ ] 4.2 Note derived/boundary vars once (e.g. `FRONTEND_URL` == `NEXT_PUBLIC_APP_URL`); remove `core/.env.base` and `app/.env.example`
- [ ] 4.3 Point root `docker-compose.yml` at root `.env.local`; pass `NEXT_PUBLIC_*` to the app build as args
- [ ] 4.4 Wrap `next dev` to load root config: `dotenv -e ../.env.local -- next dev …`
- [ ] 4.5 Update root `.gitignore` to ignore `.env.local` / `.env.staging` / `.env.production` and commit only `.env.example`
- [ ] 4.6 Verify locally: `next dev` over HTTPS picks up `NEXT_PUBLIC_*` from root `.env.local`

## 5. Rename the deployed environment `dev` → `staging` (the ripple)

- [ ] 5.1 `infra/docker-compose.vps.yml`: `env_file` `.env.dev` → `.env.staging` (both services) and update `:?... must be set in .env.dev` messages
- [ ] 5.2 `infra/scripts/vps.sh`: `ENV_FILE` → `/opt/saasmint/.env.staging`
- [ ] 5.3 Rename workflow `deploy-dev.yml` → `deploy-staging.yml` and re-point its `source /opt/saasmint/.env.dev`
- [ ] 5.4 **Manual ops step on the VPS:** `mv /opt/saasmint/.env.dev /opt/saasmint/.env.staging` — do this BEFORE the first post-merge deploy
- [ ] 5.5 Grep the repo for any remaining `.env.dev` / `deploy-dev` references; expect zero

## 6. Unify CI and install prism review

- [ ] 6.1 Merge both repos' `.github/workflows/` into one set with `paths:` filters (`core/**` → Django checks, `app/**` → Next checks)
- [ ] 6.2 Run `/prism:install-ci-review` once for the repo and add `ANTHROPIC_API_KEY` as a repo secret
- [ ] 6.3 Open a throwaway PR touching both `core/` and `app/`; confirm both stacks' checks + prism review fire

## 7. Smoke test and verify

- [ ] 7.1 Full local stack up via root compose (postgres, redis, django, celery, caddy) with no path errors
- [ ] 7.2 `make lint`, `make typecheck`, `make test` (core) and `pnpm lint`, `pnpm typecheck`, `pnpm test` (app) all pass
- [ ] 7.3 Deploy to staging from the new repo; confirm `.env.staging` is loaded and `api`/`app` come up healthy

## 8. Cut over and finalize

- [ ] 8.1 Tag the monorepo `v1.0.0`
- [ ] 8.2 Set `saasmint-core` and `saasmint-app` to read-only/archived on the remote
- [ ] 8.3 Update root `README.md` + `CLAUDE.md` to point at the new layout and reference the archived repos for pre-merge history
