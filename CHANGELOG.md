# Changelog

All notable, user-facing, and contract changes to **SaaSmint** — the monorepo
combining the `core/` Django backend and the `app/` Next.js frontend. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the project
adheres to [Semantic Versioning](https://semver.org/).

This repo is the merge of the former **`saasmint-core`** and **`saasmint-app`**
repositories. From `v0.7.0` onward the packages ship **in lockstep** — a
`v<X.Y.Z>` tag is valid only when both stacks are at `<X.Y.Z>` on `main`. Entries
are labelled **Backend** / **Frontend** where a change touched only one stack;
versions present in only one stack predate the merge and reflect the separate
pre-merge release cadences (the frontend skipped some minor versions to track the
backend). Pre-merge PR numbers reference the original repositories.

## [0.13.1] - 2026-06-06

Staging-deploy hardening for the merged monorepo. No application logic changes.

### Fixed

- Staging deploy wired to the flattened `/opt/saasmint` layout: the deploy
  workflow now `cd`s to the repo root (was a nonexistent nested path), and the
  VPS compose gained the Next.js `app` service so one tagged deploy serves both
  `api.` and `app.saasmint.net`. (#5)
- Deploy health check now gates on both API (`:8001`) and app (`:3000`)
  readiness, widened to a 90s window with app-log tailing on failure. (#5)

### Maintenance

- `bootstrap-vps.sh` clones the monorepo flat as the `deploy` user (avoids Git
  "dubious ownership" on checkout) and seeds `.env.staging` from `.env.example`.
- Removed the orphaned `app/.github/workflows/deploy-dev.yml` (GitHub only reads
  the root `.github/`; it referenced the pre-rename `.env.dev` and old path).
- Brought `saasmint-core-lib` to `0.13.1` to restore the documented
  three-package lockstep (it had lagged at `0.12.0`). (#6)

### Documentation

- Recorded the version-line and staging-deploy decisions in the
  `migrate-to-monorepo` OpenSpec change. (#5)

## [0.13.0] - 2026-06-05

Monorepo release — Django (`saasmint-core`) and Next.js (`saasmint-app`) merged
into a single repository, with full git history preserved. No application logic
changes.

### Added

- Root VS Code multi-root workspace (`saasmint.code-workspace`) with shared
  launch configs, tasks, and per-package settings for one-shot local debugging.
- Root `.vscode/launch.json` + `tasks.json` for the `code .` (non-workspace) workflow.
- Root `.env.example` covering every var from both old templates, with boundary
  vars documented once.

### Changed

- Deployed environment renamed `dev` → `staging` across the deploy workflow,
  `docker-compose.vps.yml`, and VPS scripts.
- Shared infra (Caddyfile, certs, entrypoints) relocated from `core/infra/` to
  root `infra/`.

### Fixed

- Removed hardcoded `saasmint` / `postgres` fallback credentials from
  `docker-compose.yml` and `.env.example`.
- CI postgres service switched to `POSTGRES_HOST_AUTH_METHOD: trust` to avoid
  empty-password startup failure.

### Maintenance

- Path-filtered root CI workflows (`core/**` / `app/**`).
- Deploy workflow moved to root `.github/workflows/deploy-staging.yml`.
- `dotenv-cli` added to `app/devDependencies`; lockfile updated.

## [0.12.0] - 2026-06-04

Minor release carrying new functionality **and** breaking API contract changes,
so it bumps the minor per SemVer. The previously circulated `v0.11.1`
release-candidate line is superseded — those RC tags never satisfied lockstep and
should not be used.

### Added

- **Backend** — reCAPTCHA v3 server-side token verification on the register,
  forgot-password, and resend-verification endpoints (`captcha_token` field;
  `RECAPTCHA_SECRET_KEY` empty disables it for local dev/tests). (#77)
- **Backend** — Multi-currency billing (USD, EUR, GBP, JPY, CNY). USD remains the
  catalog source of truth; `?currency=` selects display via precomputed
  `LocalizedPrice` rows (replacing the old `ExchangeRate` table), with USD
  fallback when a row is missing.
- **Backend** — OAuth cross-provider inline account-linking: untrusted links mint
  a single-use `SocialLinkRequest` and email the existing account a confirm link,
  completed via `POST /auth/oauth/confirm-link/`. (#67)
- **Backend** — Resend-verification endpoint and verify-email-on-password-reset. (#66)
- **Backend** — Daily Celery cleanup tasks for expired email-verification and
  password-reset tokens.
- **Backend** — JWT invalidation on password change (`pwd_iat` revocation) plus a
  one-time-token consume race fix.
- **Frontend** — reCAPTCHA v3 token acquisition on the signup, forgot-password,
  and resend-verification flows (`captcha_token`), dormant when
  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is unset
  ([#66](https://github.com/SergiCoder/saasmint-app/pull/66),
  [#67](https://github.com/SergiCoder/saasmint-app/pull/67)).
- **Frontend** — OAuth cross-provider account-linking confirmation flow, with a
  manual-click confirmation page that avoids burning the single-use token on
  email pre-fetch ([#57](https://github.com/SergiCoder/saasmint-app/pull/57)).
- **Frontend** — Resend-verification flow on login and profile for unverified
  accounts ([#56](https://github.com/SergiCoder/saasmint-app/pull/56)).
- **Frontend** — Dual-currency display on plan and product cards when the user's
  preferred currency differs from the billed currency
  ([#58](https://github.com/SergiCoder/saasmint-app/pull/58)).

### Changed

- **Backend, breaking** — org ownership transfer endpoint renamed from
  `PUT /orgs/{id}/owner/` to `POST /orgs/{id}/owner-transfers/`, now returning
  `201 Created` with a `Location` header.
- **Backend, breaking** — `DELETE` subscription endpoints
  (`/billing/subscriptions/me/` and `/scheduled-change/`) now return
  `204 No Content` instead of `200` with a body. Clients must `GET` to refresh state.
- **Backend, breaking** — resource-creating `POST` endpoints (register,
  checkout-session, portal-session, product-checkout) now return `201 Created`
  with a `Location` header instead of `200`.
- **Backend** — `GET /billing/subscriptions/me/` (and other list endpoints)
  return the paginated `{count, next, previous, results}` response shape.
- **Backend** — `OAuthExchangeResponseSerializer` collapsed into `TokenResponseSerializer`.
- **Backend** — Pinned Stripe API version bumped to `2026-05-27.dahlia`.
- **Frontend** — Applied stack-audit findings and aligned with the backend schema
  ([#59](https://github.com/SergiCoder/saasmint-app/pull/59)); addressed high- and
  medium-severity codebase-audit findings
  ([#60](https://github.com/SergiCoder/saasmint-app/pull/60)).
- **Frontend** — Migrated the Next.js request interceptor from `middleware` to the
  `proxy` convention (Next.js 16)
  ([#66](https://github.com/SergiCoder/saasmint-app/pull/66),
  [#67](https://github.com/SergiCoder/saasmint-app/pull/67)).
- **Frontend** — Bumped in-range dependencies (held ESLint at 9.x), updated
  Tailwind to 4.3.0, and bumped the pinned Stripe API version
  ([#65](https://github.com/SergiCoder/saasmint-app/pull/65)).

### Fixed

- **Backend** — Billing: send `customer_update[address]=auto` so Stripe
  `automatic_tax` is satisfied at checkout.
- **Backend** — Security audit pass: HTML-escape user-controlled content in
  transactional emails; remove PII from the public invitation endpoint; harden
  OAuth state and webhook `livemode` checks; allowlist OAuth error codes; require
  https-only `logo_url`; production-time session-auth guard; strict `is True`
  check for Google `email_verified`.
- **Backend** — Orgs: owner-must-be-billing enforced at the DB level
  (`ck_org_owner_must_be_billing`); accept-time seat-cap check on invites.
- **Backend** — Webhooks: mark the event row failed on any unhandled dispatch
  exception and store the exception class in the failure message.
- **Backend** — Config: enforce `JWT_SIGNING_KEY` ≥ 32 bytes and raise
  `ImproperlyConfigured` when unset in production; explicit `DEBUG=False`; order
  `CorsMiddleware` before `SecurityMiddleware`.
- **Frontend** — Prefixed all redirects with the active locale and inlined phone
  prefixes to fix next-intl routing and hydration mismatches
  ([#53](https://github.com/SergiCoder/saasmint-app/pull/53)); refined locale
  handling, redirects, and profile cleanup
  ([#54](https://github.com/SergiCoder/saasmint-app/pull/54)).
- **Frontend** — Used the paid plans' currency for the synthesised free plan card
  ([#55](https://github.com/SergiCoder/saasmint-app/pull/55)).
- **Frontend** — Subscription card server-action wiring and tier-based `isUpgrade`
  check ([#63](https://github.com/SergiCoder/saasmint-app/pull/63)); residual
  findings from multi-profile review
  ([#61](https://github.com/SergiCoder/saasmint-app/pull/61),
  [#62](https://github.com/SergiCoder/saasmint-app/pull/62)).

### Security

- **Backend** — Dependency CVE fixes: `pyjwt` and `idna` (incl. idna
  CVE-2026-45409 in the `core/` lockfile); plus `markdown-it-py`, `urllib3`, and
  `pydantic` bumps.

### Performance

- **Backend** — Database indexes and N+1 elimination across billing, orgs, users,
  and auth; batched Stripe lookups; async OAuth code exchange; shared httpx
  connection pool; functional `LOWER(email)` unique index.

### Infrastructure

- **Backend** — VPS compose `restart` policy on services; explicit `redis.conf`
  for dev.

### Maintenance

- **Backend** — `saasmint-core` and `saasmint-core-lib` bumped to `0.12.0`;
  `uv.lock` re-resolved. Large dead-code removal, function decomposition, and
  quality/idiom cleanup across billing, orgs, users, and core services.

## [0.11.0] - 2026-05-03

### Added

- **Backend** — `DELETE /billing/subscriptions/me/scheduled-change/` releases a
  pending deferred downgrade; user keeps current plan.
- **Backend** — `GET /billing/subscriptions/me/` now returns `scheduled_plan`
  (nested) and `scheduled_change_at` for rendering a "downgrading on <date>" badge.
- **Backend** — `seats_used` field on the subscription serializer (live
  `OrgMember` count, N+1-safe via subquery annotation).
- **Backend** — `audit_stripe_catalog` management command — lists or `--archive`s
  Stripe products absent from the local catalog, skipping any with active subs.
- **Backend** — Marketing inquiries endpoint for landing CTA + Contact form.
- **Frontend** — Deep-link into the billing portal for upgrades and surfaced
  scheduled downgrades in the subscription UI
  ([#49](https://github.com/SergiCoder/saasmint-app/pull/49)).
- **Frontend** — Auto-cancel of a personal subscription on team upgrade, with an
  opt-out ([#41](https://github.com/SergiCoder/saasmint-app/pull/41)).
- **Frontend** — Warning to paid users about concurrent billing when accepting an
  invitation ([#40](https://github.com/SergiCoder/saasmint-app/pull/40)); warning
  about org archival when cancelling a team subscription
  ([#39](https://github.com/SergiCoder/saasmint-app/pull/39)).
- **Frontend** — Member deletion unblocked, with subscription-cancel surfaced in
  dialogs ([#38](https://github.com/SergiCoder/saasmint-app/pull/38)).
- **Frontend** — User credit balance shown above the upgrade options
  ([#37](https://github.com/SergiCoder/saasmint-app/pull/37)).
- **Frontend** — Guided error for OAuth/password email collisions
  ([#42](https://github.com/SergiCoder/saasmint-app/pull/42)); profile note that
  billing currency locks at first purchase
  ([#43](https://github.com/SergiCoder/saasmint-app/pull/43)).
- **Frontend** — Landing CTA and contact form wired to the inquiry endpoint
  ([#35](https://github.com/SergiCoder/saasmint-app/pull/35)); version badge in
  the marketing footer ([#36](https://github.com/SergiCoder/saasmint-app/pull/36)).

### Changed

- **Backend, breaking** — `Subscription.quantity` renamed to `seat_limit` across
  codebase, serializer, and migration 0017. Frontend must read `seat_limit`.
- **Backend** — Portal plan-switch deep-link removed — plan changes go through
  `PATCH /subscriptions/me/`.
- **Backend** — `User.account_type` field removed; org membership now derived
  exclusively from `OrgMember`.
- **Frontend** — Migrated `/billing/subscriptions/me/` to a list envelope with
  `?context=` plumbing ([#44](https://github.com/SergiCoder/saasmint-app/pull/44)),
  and `/billing/credits/me/` to a multi-scope balances envelope
  ([#45](https://github.com/SergiCoder/saasmint-app/pull/45)).
- **Frontend** — Dropped `accountType` and the team-intent registration path
  ([#47](https://github.com/SergiCoder/saasmint-app/pull/47)).

### Fixed

- **Backend** — `change_plan` upgrades now release a pinning `SubscriptionSchedule`
  before `Subscription.modify` (Stripe rejects modify on a schedule-owned sub);
  revising a pending downgrade reuses the existing schedule via `modify`.
- **Backend** — `customer.subscription.updated` webhooks no longer wipe
  `scheduled_plan_id` / `scheduled_change_at` set by `subscription_schedule.*`.
- **Backend** — `update_seat_count` mirrors the new seat count locally before
  returning, so revalidate-and-refetch sees the new value without webhook lag.
- **Backend** — Portal session routes by `?context=` for concurrent billers; team
  subscription persisted on checkout to close a webhook race; hard-delete cascades
  and cancellation hardening for org deletion.
- **Backend** — Microsoft OAuth: verify `id_token` signature and trust `xms_edov`
  for email; seat reduction below current member count rejected at the API layer;
  hijack release works without staff gate (GET bounces to admin home).
- **Frontend** — Subscription UI overhaul and invitation email verification
  ([#50](https://github.com/SergiCoder/saasmint-app/pull/50)); aligned team plan
  and personal card flows ([#48](https://github.com/SergiCoder/saasmint-app/pull/48)).
- **Frontend** — Hid the auto-cancel notice when a personal subscription is
  already cancelling ([#46](https://github.com/SergiCoder/saasmint-app/pull/46)).

### Maintenance

- **Backend** — `saasmint-core` and `saasmint-core-lib` bumped to `0.11.0`;
  `psycopg` bumped to `3.3.4`; `CLAUDE.md` condensed; type-ignore suppressions
  documented in `docs/type-ignores.md`.

## [0.8.5] - 2026-04-29

_Backend only._

### Added

- `has_stripe_customer: bool` on `GET /api/v1/account/me/`. The user's billing
  currency is locked at first purchase by Stripe and the customer row survives
  subscription cancellation, so the lock is permanent once set. The frontend uses
  this flag to gate the "your billing currency can't be changed" notice. Only
  user-scoped Stripe customers count — org-scoped customers belong to the org's
  billing scope, not the user's.

## [0.8.4] - 2026-04-28

_Backend only._

### Added

- **Personal→team upgrade flow.** A personal user (with or without an active
  personal subscription) can POST a team-context checkout to
  `POST /api/v1/billing/checkout-sessions/`. The 409 guard now gates on "user
  already owns an org" rather than `account_type`.
- **`keep_personal_subscription` field on `CheckoutRequestSerializer`** (default
  `false`). On the team-context `checkout.session.completed` webhook, the user's
  existing personal subscription is scheduled to cancel at period end when the
  flag is `false`, or left running concurrently when `true`. Idempotent.
- **DB-level enforcement of "one owned org per user."** Migration
  `0011_uniq_org_owner_per_user` adds a partial unique index on `OrgMember(user)`
  where `role='owner'`. The view-layer `.exists()` check stays as a UX fast-path;
  the constraint is the authoritative TOCTOU guard.
- **`?context=personal|team` on `PATCH/DELETE /api/v1/billing/subscriptions/me/`.**
  Lets a concurrent-billing user target either active subscription explicitly.
  Defaults: `team` for org members, `personal` otherwise; the `is_billing=True`
  gate only applies to `?context=team`.

### Changed

- **`GET /api/v1/billing/subscriptions/me/` returns a paginated list** instead of
  a single object (**breaking** for clients reading a top-level `Subscription`).
  An empty `results` list now represents the free tier (replacing the old 404).
- **`account_type` flips atomically with org creation** inside the org-creation
  transaction; the flip is one-way.
- **Team checkout creates a fresh org-scoped Stripe customer** rather than reusing
  the user-scoped one, keeping personal and team subs on distinct customers.
- **`OnTeamCheckoutCompleted` callback** gains a trailing
  `keep_personal_subscription: bool` argument decoded from Stripe metadata.

### Removed

- **User-scoped `StripeCustomer` rebind branch in `_create_org_with_owner`** —
  unreachable now that the team-checkout customer is created fresh and org-scoped.

## [0.8.3] - 2026-04-27

_Backend only._

### Added

- `OAuthEmailUnverifiedCollisionError` exception, raised when an OAuth-provided
  email matches an existing user but auto-link is unsafe (provider untrusted or
  `email_verified` false).

### Changed

- **OAuth + existing-password-account collision returns a specific error code** —
  `OAuthCallbackView` redirects to
  `/auth/error?error=oauth_email_unverified_collision` (was the generic
  `email_not_verified`) so the frontend can guide the user to log in and link
  the provider explicitly.
- **Auto-link onto an existing local account now requires the provider to be on
  `TRUSTED_FOR_AUTO_LINK`** (`{google, github, microsoft}`). Defense-in-depth for
  any future provider added without explicit trust review.

## [0.8.2] - 2026-04-27

_Backend only._

### Changed

- **Team-subscription cancellation now hard-deletes the org** and everything
  cascading from it (`OrgMember`, pending `Invitation`, single-org-member `User`
  accounts) when `customer.subscription.deleted` fires. Previously left an
  `is_active=False` zombie. The cascade runs in a Celery task so the webhook
  returns within Stripe's retry window.
- **The cascade is unconditional** — voluntary and involuntary cancellation
  collapse to the same path; the handler does not branch on
  `cancellation_details.reason`.

### Removed

- **`Org.is_active` column** (migration `0010_remove_org_is_active`) and all
  `is_active=True` filters, plus the field on the core `Org` domain model.
- **`deactivate_org`**, **`cancel_pending_invitations_for_org`**, the
  **`_InvitationOrgGone`** exception, and the `if not org.is_active` guard in
  `InvitationAcceptView` — all dead after the hard-delete rewrite.

## [0.8.1] - 2026-04-27

_Backend only._

### Changed

- **Stripe subscription cancellations now pass `prorate=False`.** Org deletion and
  GDPR account deletion are terminal; the unused billing period is not refunded.

### Fixed

- **Org-deletion sub-cancel task is now idempotent and per-item fault-isolated.**
  `cancel_stripe_subs_task` swallows Stripe `resource_missing` and no longer
  short-circuits the loop on a transient error — every sub is attempted, then the
  first failure is re-raised so Celery records it.
- **`deactivate_org` is a no-op when the org row is already gone** (covers the
  DELETE-then-webhook race).

### Removed

- **`Org.deleted_at` column and partial unique index** (migration
  `0009_remove_org_deleted_at`) — hard delete is the only termination path; the
  partial `UniqueConstraint(slug, where deleted_at IS NULL)` becomes unconditional.

## [0.8.0] - 2026-04-26

_Backend only._

### Added

- **Marketing inquiries endpoint** — `POST /api/v1/marketing/inquiries/`
  (unauthenticated) forwards landing-CTA and Contact-form submissions to the
  `MARKETING_INQUIRIES_TO` inbox via Resend on a Celery task. Returns `204` on
  acceptance and honeypot drops, `400` on validation failure, `429` over the rate
  limit, `500` if the inbox env var is missing. Logs redact the sender and never
  include the body.
- **Dedicated throttle scope `marketing_inquiries` at `3/10minute`** — does not
  share the `auth` scope; a small custom throttle class extends DRF's rate parser
  to support multi-unit periods.
- New required env var `MARKETING_INQUIRIES_TO`.

## [0.7.2] - 2026-04-25

_Backend only._

### Fixed

- **Microsoft OAuth login signs verified-tenant users in directly.** The callback
  validates the OIDC `id_token` (signature against Microsoft's JWKS, audience
  pinned to the client ID, issuer prefix-checked); when `xms_edov` is `true` the
  user is signed in with `is_verified=True`, mirroring the Google/GitHub UX.
  Otherwise it falls back to the unverified path.

### Security

- **Microsoft Graph `/me` is no longer treated as proof of email ownership.** A
  tenant admin can set a user's `mail` attribute to any string; trust now flows
  from the signed `id_token`'s `xms_edov` claim, not Graph — closing an
  account-takeover vector against existing password accounts.

## [0.7.1] - 2026-04-25

_Backend only._

### Fixed

- **Hijack release no longer 405s on the admin re-login bounce.**
  `HijackReleaseView` is no longer wrapped in `staff_member_required` (during
  impersonation `request.user` is the non-staff impersonated user). GETs to
  `/hijack/release/` now 302 to the admin home as a no-op; stop-impersonating
  lands on `/admin/`.

## [0.7.0] - 2026-04-25

First lockstep release. From here both stacks ship at matching versions.

### Changed

- **Backend, breaking** — `Subscription` is now a pure Stripe mirror. Every
  persisted row has a `stripe_id`; the free tier is the *absence* of a row. The
  dual-shape `stripe_id IS NULL` placeholder is gone. (#46)
- **Backend, breaking** — `GET /api/v1/billing/subscriptions/me/` returns **404**
  for free-tier users (previously a synthetic 200). `GET /billing/plans/` no
  longer includes the "Personal Free" row. (#46)
- **Backend, breaking** — signup paths (`/auth/register/`, org-owner, OAuth
  callback) no longer create any Subscription; the user gets one only on payment.
  The `customer.subscription.deleted` webhook no longer creates a fallback free
  subscription. (#46)

### Added

- **Frontend** — Free plan card, aligning billing with backend v0.7.0
  ([#32](https://github.com/SergiCoder/saasmint-app/pull/32)).

### Removed

- **Backend** — `Subscription.is_free`, `FREE_SUBSCRIPTION_PERIOD_END`,
  `assign_free_plan`, `_lock_user`, `Plan.free_plans()`, `delete_free_for_user`,
  `get_free_plan`, the "Personal Free" seed entry, and the
  `uniq_free_subscription_per_user` constraint. `PlanTier.FREE = 1` is preserved
  for legacy data but no longer seeded. (#46)

### Performance

- **Backend** — Migration `0014` deletes free Subscriptions in 1000-row batches;
  one fewer query per `customer.subscription.created/updated` webhook; one fewer
  `SELECT FOR UPDATE` per signup. (#46)

### Documentation

- **Backend** — CLAUDE.md "Versioning" rule added: every PR bumps both
  `pyproject.toml` files together; the packages ship in lockstep. (#46)

### Maintenance

- **Backend** — `uv.lock` re-resolved to match the bumped versions. (#47)

## [0.5.0] - 2026-04-25

_Frontend only._

### Added

- Teams feature: organisations, member, and seat management
  ([#14](https://github.com/SergiCoder/saasmint-app/pull/14)).
- Complete billing, pricing, and subscription flows
  ([#12](https://github.com/SergiCoder/saasmint-app/pull/12)).
- Social login, forgot/reset password, and change password
  ([#11](https://github.com/SergiCoder/saasmint-app/pull/11)).
- User profile, avatar upload, and account management
  ([#9](https://github.com/SergiCoder/saasmint-app/pull/9)).

### Changed

- Replaced Supabase with Django JWT authentication
  ([#13](https://github.com/SergiCoder/saasmint-app/pull/13)).
- Parsed gateway responses with Zod and typed errors instead of generic casts
  ([#18](https://github.com/SergiCoder/saasmint-app/pull/18)).
- Refactored server actions onto the `ActionResult` envelope, with subscription
  page cleanup and auth/nav fixes
  ([#26](https://github.com/SergiCoder/saasmint-app/pull/26)).
- Updated branding copy and dashboard quick-start actions
  ([#10](https://github.com/SergiCoder/saasmint-app/pull/10)).
- Infrastructure cleanups: avatar upload/delete moved into the user gateway
  ([#22](https://github.com/SergiCoder/saasmint-app/pull/22)), centralised OAuth
  URL construction ([#23](https://github.com/SergiCoder/saasmint-app/pull/23)),
  dropped phantom `userId` from gateway signatures
  ([#24](https://github.com/SergiCoder/saasmint-app/pull/24)), removed dead
  use-cases, ports, errors, and i18n keys
  ([#21](https://github.com/SergiCoder/saasmint-app/pull/21)).

### Fixed

- Hardened the OAuth flow, security headers, and server actions
  ([#17](https://github.com/SergiCoder/saasmint-app/pull/17)).
- Fixed next-intl routing, middleware refresh scope, and SSG setup
  ([#20](https://github.com/SergiCoder/saasmint-app/pull/20)).
- Fixed signup/checkout, auth session return, and test gaps
  ([#28](https://github.com/SergiCoder/saasmint-app/pull/28)).

### Performance

- Split server/client component boundaries
  ([#19](https://github.com/SergiCoder/saasmint-app/pull/19)) and additional perf
  & UI cleanup ([#25](https://github.com/SergiCoder/saasmint-app/pull/25)).

## [0.4.0] - 2026-04-01

_Frontend only._ Initial public scaffolding of the Next.js frontend, built on
strict hexagonal layers (domain → application → infrastructure → presentation).

### Added

- Domain layer: models, errors, and tests
  ([#1](https://github.com/SergiCoder/saasmint-app/pull/1)).
- Application layer: ports and use cases
  ([#2](https://github.com/SergiCoder/saasmint-app/pull/2)).
- Infrastructure layer: gateway implementations and DI registry
  ([#3](https://github.com/SergiCoder/saasmint-app/pull/3)).
- Presentation layer: atomic-design component library
  ([#4](https://github.com/SergiCoder/saasmint-app/pull/4)).
- App pages, server actions, and configuration
  ([#5](https://github.com/SergiCoder/saasmint-app/pull/5)).
- MIT license ([#7](https://github.com/SergiCoder/saasmint-app/pull/7)).

### Fixed

- Code-review pass: security, accessibility, performance, DRY, and test coverage
  ([#6](https://github.com/SergiCoder/saasmint-app/pull/6)).

## Deprecated tags (pre-lockstep)

These tags shipped with divergent versions across `saasmint-core` and
`saasmint-core-lib`. Kept for deploy-forensics; do not use as a basis for new
work. From `v0.7.0` onward all packages ship in lockstep.

- `v0.5.0` — `saasmint-core` 0.5.0, `saasmint-core-lib` 0.4.0.
- `v0.5.1` — `saasmint-core` 0.5.1, `saasmint-core-lib` 0.4.0.
- `v0.6.0` — `saasmint-core` 0.6.0, `saasmint-core-lib` 0.5.0.
