# SaaSmint — Makefile (monorepo root)

SHELL := bash
unexport VIRTUAL_ENV  # prevent uv from using a stale venv from the parent shell

# Compose interpolates ${VAR} from the shell env or a default `.env` file only —
# never from `.env.local`. This project standardizes on `.env.local`, so pass it
# explicitly or POSTGRES_* (and the pg_isready healthcheck) resolve to empty.
COMPOSE := docker compose --env-file .env.local

# ─── Development ──────────────────────────────────────────────────────────────

.PHONY: dev
dev: ## Run Django + Celery + infra + Stripe webhook forwarder
	$(COMPOSE) up --build

.PHONY: stop
stop: ## Stop all running services
	$(COMPOSE) down

.PHONY: logs
logs: ## Tail Django logs
	$(COMPOSE) logs -f django

# ─── Database ─────────────────────────────────────────────────────────────────

.PHONY: migrate
migrate: ## Run pending DB migrations (stack must be running)
	$(COMPOSE) exec django uv run python manage.py migrate

.PHONY: static
static: ## Collect static files (stack must be running)
	$(COMPOSE) exec django uv run python manage.py collectstatic --no-input --clear

.PHONY: migration
migration: ## Create a new migration (make migration MSG="add coupon table")
	$(COMPOSE) run --rm django uv run python manage.py makemigrations $(MSG)

.PHONY: seed
seed: ## Seed dev data — plans, test users, Stripe products
	$(COMPOSE) run --rm django uv run python manage.py seed_dev_data

# ─── Stripe ───────────────────────────────────────────────────────────────────

.PHONY: stripe-logs
stripe-logs: ## Tail the Stripe webhook forwarder logs
	$(COMPOSE) logs -f stripe-cli

.PHONY: sync-stripe
sync-stripe: ## Push local Plans/Products to Stripe (creates real prices)
	$(COMPOSE) exec django uv run python manage.py sync_stripe_catalog

# ─── OpenAPI ──────────────────────────────────────────────────────────────────

.PHONY: schema
schema: ## Regenerate schema.yml from drf-spectacular (stack must be running)
	$(COMPOSE) exec django uv run python manage.py spectacular --file schema.yml

# ─── Testing ──────────────────────────────────────────────────────────────────

.PHONY: test
test: ## Run Django tests
	cd core && uv run --extra dev pytest -v

.PHONY: test-core
test-core: ## Run core unit tests
	cd core/core && uv run --extra dev pytest -v

.PHONY: test-app
test-app: ## Run frontend tests
	cd app && pnpm test

# ─── Linting ──────────────────────────────────────────────────────────────────

.PHONY: lint
lint: ## Lint with Ruff
	cd core && uv run ruff check .
	cd app && pnpm lint

.PHONY: format
format: ## Format with Ruff
	cd core && uv run ruff format .
	cd app && pnpm format

.PHONY: typecheck
typecheck: ## Run mypy (django + core)
	cd core && uv run mypy .
	cd core/core && uv run mypy .
	cd app && pnpm typecheck

# ─── Setup ────────────────────────────────────────────────────────────────────

.PHONY: install
install: ## Install all Python dependencies
	cd core && uv sync
	cd app && pnpm install

.PHONY: https-setup
https-setup: ## Generate mkcert TLS certs for local HTTPS (run once per machine)
	@echo ""
	@echo "Local HTTPS setup — run these commands once on your machine:"
	@echo ""
	@echo "  Install mkcert:"
	@echo "    macOS:   brew install mkcert"
	@echo "    Ubuntu:  sudo apt install mkcert"
	@echo "    Windows: winget install FiloSottile.mkcert"
	@echo "             (or: choco install mkcert)"
	@echo ""
	@echo "  Then generate certs:"
	@echo "    mkdir -p infra/certs"
	@echo "    mkcert -install"
	@echo "    mkcert -key-file infra/certs/localhost-key.pem -cert-file infra/certs/localhost.pem localhost"
	@echo ""
	@echo "  After that, 'make dev' will serve HTTPS at https://localhost:8443"
	@echo ""

.PHONY: setup
setup: install https-setup ## Full first-time project setup
	@cp -n .env.example .env.local 2>/dev/null || true
	@echo ""
	@echo "Setup complete. Next steps:"
	@echo "  1. Fill in .env.local with your Stripe test keys"
	@echo "  2. Follow the mkcert instructions above to enable local HTTPS"
	@echo "  3. make dev"

# ─── Git Flow ─────────────────────────────────────────────────────────────────

.PHONY: feature
feature: ## Create a feature branch from dev (make feature NAME=my-feature)
	@test -n "$(NAME)" || (echo "ERROR: NAME is required — make feature NAME=my-feature" && exit 1)
	git fetch origin
	git checkout dev && git pull origin dev
	git checkout -b feature/$(NAME)
	git push -u origin feature/$(NAME)

.PHONY: fix
fix: ## Create a fix branch from dev (make fix NAME=my-fix)
	@test -n "$(NAME)" || (echo "ERROR: NAME is required — make fix NAME=my-fix" && exit 1)
	git fetch origin
	git checkout dev && git pull origin dev
	git checkout -b fix/$(NAME)
	git push -u origin fix/$(NAME)

.PHONY: hotfix
hotfix: ## Create a hotfix branch from main (make hotfix NAME=critical-bug)
	@test -n "$(NAME)" || (echo "ERROR: NAME is required — make hotfix NAME=critical-bug" && exit 1)
	git fetch origin
	git checkout main && git pull origin main
	git checkout -b hotfix/$(NAME)
	git push -u origin hotfix/$(NAME)
	@echo "Hotfix branch ready. When done: PR into main, then PR into dev to keep them in sync."

# ─── Help ─────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | sort \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
