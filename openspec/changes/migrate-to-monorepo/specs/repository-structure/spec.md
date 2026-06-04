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

The monorepo SHALL maintain one version line for the combined product; the predecessor repositories' overlapping per-repo tags SHALL NOT be carried into the new repository.

#### Scenario: Fresh version line at consolidation

- **WHEN** the consolidation is released
- **THEN** the repository is tagged `v1.0.0`
- **AND** the overlapping predecessor tags (`v0.4.0`, `v0.7.0`, `v0.11.0`, `v0.12.0`) are absent from this repository's tag list
