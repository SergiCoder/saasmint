# SaaSmint

Monorepo for SaaSmint — a Django + Next.js SaaS.

- **`core/`** — Django 6 / DRF / Celery / Stripe backend ([core/README.md](core/README.md))
- **`app/`** — Next.js 16 / React 19 frontend ([app/README.md](app/README.md))
- **`infra/`** — shared Docker Compose, Caddy, nginx, TLS certs, deploy scripts
- **`openspec/`** — spec-driven change workflow (capability specs + change proposals)

## Quick start

```bash
make setup            # install backend (uv) + frontend (pnpm) deps; prints env + TLS setup
# fill in .env.local, generate local TLS certs (mkcert — see `make https-setup`), then:
make dev              # backend + infra in Docker: Postgres, Redis, Django, Celery, Caddy, Stripe CLI
cd app && pnpm dev    # frontend on host
```

Or open **`saasmint.code-workspace`** in VS Code and run the **"Run Everything Local"** build task (`Ctrl+Shift+B`) — it starts the backend stack and the frontend together, and the workspace ships launch configs to debug both.

- App: `https://localhost:3000` · API (via Caddy): `https://localhost:8443`

## Environment

One root template, `.env.example` → copy to `.env.local`. `NEXT_PUBLIC_*` are **build-time** (baked into the frontend bundle); everything else is backend runtime. One file per environment: `.env.local` (dev), `.env.staging` (the VPS), `.env.production`.

## History

This repo consolidates the former **`saasmint-core`** and **`saasmint-app`** repositories, merged with full git history (`git blame` traces to the original commits). Those archived repos hold the pre-merge `v0.x` tags.

## License

MIT
