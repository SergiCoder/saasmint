# environment-config

## Purpose

Defines how SaaSmint configures its two stacks (Django backend under `core/`, Next.js frontend under `app/`) from a single, environment-keyed set of env files. One committed template at the repository root seeds local configuration for both stacks; each deployed environment is identified by one `.env.<environment>` file; build-time (`NEXT_PUBLIC_*`) and runtime configuration are kept on separate planes; and within an environment all services share one env file so boundary values are defined once. Operational deploy details live in `infra/scripts/` and the relevant CLAUDE.md runbooks.

## Requirements

### Requirement: Single root configuration template

The repository SHALL provide exactly one committed environment template, `.env.example`, at the repository root, covering both `core` and `app` variables and sectioned by service. No per-package template (`core/.env.base`, `app/.env.example`) SHALL remain.

#### Scenario: Developer bootstraps local config from one template

- **WHEN** a developer copies `.env.example` to `.env.local`
- **THEN** the file contains every variable required by both the Django backend and the Next.js frontend
- **AND** no other env template exists under `core/` or `app/`

#### Scenario: Frontend dev server loads root config

- **WHEN** `next dev` runs locally from `app/`
- **THEN** it loads variables from the repository-root `.env.local`
- **AND** not from a separate `app/.env.local`

### Requirement: Environment naming spine

Each environment SHALL be identified by a single env file named `.env.<environment>`, where `<environment>` is one of `local`, `staging`, or `production`. The deployed VPS environment SHALL be named `staging`. The name `dev` SHALL NOT identify a deployed environment.

#### Scenario: Local development loads .env.local

- **WHEN** the stack runs on a developer machine
- **THEN** configuration is loaded from `.env.local`

#### Scenario: Deployed staging server loads .env.staging

- **WHEN** the VPS stack starts
- **THEN** configuration is loaded from `/opt/saasmint/.env.staging`
- **AND** no file, compose service, or CI workflow references `.env.dev`

### Requirement: Build-time vs runtime configuration split

Variables consumed by the Next.js build (`NEXT_PUBLIC_*`) SHALL be supplied at build time as Docker build args and baked into the static bundle; runtime-only variables SHALL be supplied via `env_file` at container start.

#### Scenario: Frontend public vars baked at build

- **WHEN** the `app` image is built
- **THEN** every `NEXT_PUBLIC_*` value is passed as a build arg and baked into the produced bundle

#### Scenario: Backend secrets injected at runtime

- **WHEN** the `django` or `celery` container starts
- **THEN** runtime configuration (secrets, database and Redis URLs) is supplied via `env_file`
- **AND** is not baked into the image

### Requirement: One shared env file per environment

Within a single environment, all services (`django`, `celery`, `app`) SHALL load configuration from the same env file, so boundary values shared across services are defined exactly once.

#### Scenario: Single source of truth per environment

- **WHEN** the staging stack runs
- **THEN** `django`, `celery`, and `app` all reference `/opt/saasmint/.env.staging`
- **AND** a value shared across the boundary (e.g. the frontend/app URL) is defined a single time rather than duplicated per service
