# SaasMint Core

Django 6 SaaS backend. Python 3.12, uv, PostgreSQL (docker-compose / CI service), Celery + Redis.

API endpoints in this doc are written without the `/api/v1/` prefix for brevity (e.g. `/billing/subscriptions/me/` is served at `/api/v1/billing/subscriptions/me/`).

## Architecture

- `core/saasmint_core/` — framework-agnostic domain layer (domain models, services, repository interfaces).
- `apps/` — Django apps (`users`, `billing`, `orgs`, `dashboard`, `admin_panel`, `marketing`). Each has models, views, serializers, urls, tests/.
- `config/` — Django settings (base/dev/test/prod), root urls, celery, `wsgi.py` and `asgi.py` entrypoints.
- `middleware/` — `security.py` (CSP / security headers), `exceptions.py` (DRF error-envelope normalisation).
- `infra/` — entrypoint scripts, Caddy config, deploy assets.
- `helpers.py` — shared Django helpers (`get_user`, `aget_or_none`, `aget_latest_or_none`).
- Django apps implement core's repository interfaces and wire them to DRF views/serializers.

## Billing model

- **Catalog**: USD `amount` (cents) on `PlanPrice`/`ProductPrice` is the **fallback anchor**. Endpoints accept `?currency=` for display; the response's `display_amount` comes from precomputed `LocalizedPrice` rows (one per `(price, currency)`, friendly-rounded by the daily `sync_localized_prices` task). Missing row → fall back to USD `amount`. Stripe charges in the user's resolved billing currency (from `BILLING_CURRENCIES`); display-only currencies (in `SUPPORTED_CURRENCIES` but not `BILLING_CURRENCIES`) fall back to USD at checkout.
- **Per-country pricing** (the real pricing dimension is the **tax region**, not currency — FR and DE are both EUR but priced independently): `CountryPrice` (XOR FK to `PlanPrice`/`ProductPrice`, `country` ISO-3166-1 alpha-2, `currency`, `sticker_minor`, `base_minor`, `is_curated`, `stripe_price_id`). The **source of truth is `sticker_minor`** — a human-set, **tax-inclusive** consumer price. The Stripe Price `unit_amount` is `base_minor = round(sticker / (1 + standard_vat_rate(country)))` (`apps/billing/vat.py` → `derive_base`), kept `tax_behavior=exclusive` so `automatic_tax` adds destination VAT back on top and a standard-rated consumer pays the sticker. The VAT-rate table in `vat.py` is **authoritative only for that derivation** — Stripe Tax is authoritative for the tax actually charged. Net (= base) varies per market by design. `is_curated=True` (set on any admin edit) excludes a row from the daily FX-suggestion refresh in `sync_localized_prices`.
- **Country resolution & reverse charge**: `apps/billing/views._resolve_pricing_country` resolves `?country=` override (wins) → locale (user pref / Accept-Language) → edge IP (`CF-IPCountry`) → USD fallback. The resolved country selects the per-country sticker (display) and Stripe Price (checkout); the address entered at Checkout is authoritative for tax. Checkout sets `tax_id_collection: {enabled: true}` (load-bearing — without it Stripe treats EU B2B as B2C and **wrongly charges VAT**) alongside `automatic_tax` + `customer_update[address]=auto`. Cross-border EU/UK B2B with a valid VIES/UK VAT ID is reverse-charged (pays the base, 0 VAT); **domestic B2B (e.g. Spanish NIF) is NOT reverse-charged — pays full IVA** (Stripe decides from the address, validated in test mode 2026-06-07).
- **Plans**: `(context, tier, interval)` — `context` is `personal`|`team`, `tier` is `IntegerChoices` (`2=basic`, `3=pro`; `1=free` reserved for legacy, not seeded).
- **Subscription = pure Stripe mirror**. Every row has a `stripe_id`, synced via webhooks. Free tier = absence of a row. `GET /billing/subscriptions/me/` returns paginated `{count,next,previous,results}` with 0–2 rows (one personal, one team for concurrent billers).
- **Products**: one-time purchases (credit packs / Boost). `POST /billing/product-checkout-sessions/` (Stripe Checkout `mode=payment`). Webhook `on_product_checkout_completed` grants credits via `CreditTransaction` + `CreditBalance`.
- **Credits**: `CreditBalance` (denormalized, XOR `user`/`org`) + `CreditTransaction` (immutable, unique on `stripe_session_id` for idempotency). `GET /billing/credits/me/` → `{balances:[...]}`.
- **Context selector**: subscription mutations and product checkout accept `?context=personal|team`. Default: `team` for org members, `personal` otherwise. Subscription mutations on `?context=team` require `is_billing=True` on an active org membership; product checkout on `?context=team` requires `role=OWNER`. Owners are always `is_billing=True` (DB check constraint `ck_org_owner_must_be_billing`), but admins/members can also be granted `is_billing=True`.
- **Org membership**: derived from `OrgMember.objects.filter(user_id=...).exists()`. The legacy `User.account_type` and the org-owner registration endpoint were removed — there is now exactly one register path: `POST /auth/register/`.
- **Team checkout**: mints a fresh org-scoped Stripe customer at init; webhook persists the `StripeCustomer` row inside `_create_org_with_owner`. Personal and team subs always live on distinct customers — the split is **for invoicing isolation** (separate tax IDs, addresses, receipts, payment methods per scope), not currency.
- **Owner uniqueness**: DB-enforced via partial unique index on `OrgMember(user) WHERE role='owner'` (`uniq_org_owner_per_user`). The view-layer `.exists()` check is a UX fast-path; the constraint is the authoritative TOCTOU guard.
- **Personal→team upgrade**: `keep_personal_subscription` field on `CheckoutRequestSerializer` (default `false`) controls whether the existing personal sub is scheduled to cancel at period end.
- **Stripe API**: pinned to `2026-05-27.dahlia` (a backward-compatible monthly release within the `dahlia` major introduced by `2026-03-25.dahlia`). `cancel_at_period_end=True` → `cancel_at="min_period_end"`; `current_period_start/end` live on subscription items. `Subscription.cancel_at` mirrors Stripe's scheduled-cutover (distinct from `canceled_at`). Cancel/resume mutations write the Stripe response back locally before returning so PATCH-then-GET sees new state without waiting for the webhook.
- **Deferred downgrades**: PATCH `/subscriptions/me/` with a `plan_price_id` whose `amount < current price unit_amount` creates a Stripe `SubscriptionSchedule` (current price → period end → new price) instead of switching immediately. Upgrades/same-amount switches still apply now. The `subscription_schedule.{created,updated}` webhooks mirror the pending switch onto `Subscription.scheduled_plan` + `scheduled_change_at`; `.{released,canceled,aborted}` clear them. `DELETE /subscriptions/me/scheduled-change/` releases an active schedule (user keeps current plan); like cancel/resume, it writes the cleared `scheduled_plan`/`scheduled_change_at` state locally before returning so PATCH-then-GET sees it without webhook lag. Cancel/cancel-now first releases any pinning schedule via `sub.schedule` lookup so Stripe doesn't reject the cancel or modify call.
- **Seeding**: `seed_catalog` (idempotent — seeds USD `amount` **and** a `CountryPrice` row per launch country with a suggested sticker; never overwrites a curated sticker, only re-aligns `base_minor`) → `sync_localized_prices` (recomputes `LocalizedPrice` rows from the FX feed **and** refreshes the FX-suggested sticker on `is_curated=False` `CountryPrice` rows) → `sync_stripe_catalog` (mints per-currency Prices and one **exclusive** per-country Price per `CountryPrice` from `derive_base`, idempotent via `lookup_key`; also applies the one-time `unspecified → exclusive` `tax_behavior` modify to existing Prices in place). All run from `infra/entrypoint.sh` after `migrate` on every deploy in this order — `sync_localized_prices` must precede `sync_stripe_catalog` because the latter reads `LocalizedPrice.amount_minor` (and the curated stickers) when minting Prices.

## Updating prices

The catalog has three layers; touch them in order. Each step is idempotent.

1. **Edit the USD amount in `apps/billing/management/commands/seed_catalog.py`.** USD cents are the source of truth Stripe charges against — every other amount derives from this. To change a price, change it here.
2. **Run `seed_catalog`** (`docker compose run --rm django uv run python manage.py seed_catalog`, or just redeploy — `infra/entrypoint.sh` runs it). Updates `PlanPrice.amount` / `ProductPrice.amount` in the DB.
3. **Run `sync_localized_prices`** (or wait for the daily Celery beat tick) to regenerate `LocalizedPrice` rows for every `(price, currency)`. The task fetches USD→all rates from `open.er-api.com` and applies `format_amount` + `round_friendly` (charm-pricing for two-decimal currencies, nearest 10/100 for zero-decimal). Failure is non-fatal at every layer: a flaky FX feed, a transient HTTP error, or a malformed payload all log an error and return 0 — existing `LocalizedPrice` rows are preserved so the catalog is never erased. **Must run before `sync_stripe_catalog`** — the next step reads `LocalizedPrice.amount_minor` when minting non-USD Stripe Prices.
4. **Run `sync_stripe_catalog`** to mint a new immutable Stripe `Price` and repoint `stripe_price_id` via `lookup_key`. USD lands on `PlanPrice`/`ProductPrice.stripe_price_id`; non-USD billing currencies land on `LocalizedPrice.stripe_price_id`. Existing subscriptions stay on the old Stripe price until they renew or are migrated; new checkouts use the new one.

**Adding a new display-only currency**: append the ISO code to `SUPPORTED_CURRENCIES` in `core/saasmint_core/services/currency.py` (and `ZERO_DECIMAL_CURRENCIES` if applicable), then run `sync_localized_prices`. No migration. The new currency is immediately accepted on `?currency=`; until `sync_localized_prices` finishes, the API falls back to the USD `amount` for that currency. Checkout still charges in USD for display-only currencies.

**Adding a new billable currency** (Stripe charges in it): do the above, then also add the ISO code to the `BILLING_CURRENCIES` env var (default set in `config/settings/base.py` → `billing_currencies`). Then run `sync_localized_prices` followed by `sync_stripe_catalog` to mint real Stripe Prices for that currency. `usd` must always remain in `BILLING_CURRENCIES`.

**Curating a per-country sticker** (the tax-inclusive consumer price): edit `CountryPrice.sticker_minor` in the Django admin — saving auto-sets `is_curated=True` (so the daily FX sweep leaves it alone) and re-derives `base_minor`. Then run `sync_stripe_catalog` to mint/repoint the exclusive Stripe Price. The derivation uses `standard_vat_rate(country)` from `apps/billing/vat.py`; update that table (and re-sync) if a country's standard rate changes. Seeded stickers reuse the USD `amount` as a round placeholder until curated — `sync_localized_prices` refines un-curated rows from the FX feed.

**Adding a per-country market**: add the country → currency entry to `COUNTRY_CURRENCY` (and a rate to `STANDARD_VAT_RATES` if missing) in `apps/billing/vat.py`, then `seed_catalog` → `sync_stripe_catalog`. No migration. **Gate launch on the tax registration existing** (see below) — until then keep the country on the USD fallback (don't seed it) so you never collect tax you can't remit.

**Tax registrations (deploy-blocking, NOT code — confirm with an accountant; not tax advice)**: EU B2C needs Spain **OSS** (note the €10k cross-border B2C threshold); UK B2C needs a **standalone UK VAT registration** (OSS does not cover the UK post-Brexit — until it exists, UK consumers are `not_collecting` and pay only the base); US needs **state nexus** registrations as thresholds are crossed; China VAT is generally **not collected** at checkout by a foreign digital seller. Add each as a Stripe Tax registration before flipping that country live.

**What never changes**: `PlanPrice.amount` / `ProductPrice.amount` are always USD cents — the fallback anchor. `display_amount` is FE-only. The Stripe Price used at checkout always matches the currency Stripe will charge, so display drift can never cause a wrong-currency charge.

## Pre-push checklist

```bash
make lint        # ruff check
make typecheck   # mypy
make test        # pytest
```

Fix errors before pushing. Do not skip.

## Commands

```bash
make dev         # docker compose up (Django + Celery + Postgres + Redis)
make test        # pytest -v
make migrate     # run migrations (stack running)
make schema      # regenerate schema.yml (manage.py spectacular --file schema.yml; stack must be running)
```

After modifying any endpoint, run `make schema` to regenerate `schema.yml`.

## Code style

- Always use type hints.
- Don't hand-edit auto-generated migrations — regenerate.

## Refactoring guardrails

- **`201 Created` responses must include `Location: <url>`** alongside the URL in the body. The header serves HTTP intermediaries / observability tooling; the body serves the SPA. Don't drop one when refactoring the other — applies to all Stripe-session creators (`/billing/checkout-sessions/`, `/billing/portal-sessions/`, `/billing/product-checkout-sessions/`) and any new 201 endpoint.
- **`@functools.cache` on a function that reads `settings` (or any module-level mutable) must take the relevant value as a parameter** so the cache key varies under `override_settings`. Zero-arg cached helpers reading `settings.X` freeze on first call and silently ignore test overrides — see `_host_matchers` in `apps/billing/serializers.py` for the correct pattern (settings value passed in).
- **Removing the only production caller of a helper means deleting the helper.** Don't leave functions kept alive only by their tests — the tests give false confidence about a code path that no longer runs in production.
- **`CaptchaProtectedSerializer.validate()` raises `CaptchaFailedError(APIException)`, not `ValidationError`.** This is intentional: the error must surface as a top-level envelope error with `code="captcha_failed"` (HTTP 400), not as a field-level validation message. Don't change it to `ValidationError` when refactoring — the distinction matters to frontend error handling.

## Bug investigation

For bugs touching infra, proxy, OAuth, or deploy:
- State which layer owns the bug (frontend / backend / proxy / infra) and the evidence before editing.
- Check proxy header trust (`SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST`) before touching app logic for URL/scheme issues.
- Don't edit `config/settings/` for bugs whose evidence points at frontend or proxy.

## Security rules

- Webhooks: verify `livemode`/env, not just signature.
- Access checks belong in the queryset lookup, not just the serializer.
- Token-based actions: verify the caller owns the token's subject.
- All password inputs go through `validate_password()`.
- OAuth `email_verified=True` only from a provider-signed token. Microsoft: signature-valid OIDC `id_token` with `xms_edov: true` — Graph `/me.mail` is admin-mutable and doesn't prove ownership.
- Auto-linking OAuth onto an existing local account requires `email_verified=True` AND the provider on `apps.users.services.TRUSTED_FOR_AUTO_LINK` (`google`, `github`, `microsoft`). Otherwise the callback mints a `SocialLinkRequest` and emails the existing account a single-use link; clicking the link goes through `POST /auth/oauth/confirm-link/` which attaches the `SocialAccount`, marks `is_verified=True`, and signs the user in. Inactive accounts are silently dropped (no email queued, identical redirect — anti-enumeration).

## Settings

- Never set `ALLOWED_HOSTS=["*"]` when `USE_X_FORWARDED_HOST=True`.
- Separate env vars for secrets with different rotation lifecycles (`JWT_SIGNING_KEY` vs `SECRET_KEY`).
- CSP applied only to HTML responses. `/api/docs/` + `/api/redoc/` get the docs bucket; everything else (`/admin/`, `/hijack/`, `/dashboard/`, DRF browsable API) shares moderate `default-src 'self'` + `script-src 'self'` + `style-src 'self' 'unsafe-inline'` + `frame-ancestors 'self'`.
- `RECAPTCHA_SECRET_KEY` empty (the default) disables reCAPTCHA verification entirely — local dev and tests run keyless. `RECAPTCHA_MIN_SCORE` (default 0.5, range 0.0–1.0) is the rejection threshold; tune it from production logs. Both settings live in `apps/users/captcha.py` and are used on the register / forgot-password / resend-verification endpoints.

## CI/CD

- No `${{ github.* }}` interpolated into workflow shell — pass via `env:` and quote `"$VAR"`.

## Type-ignore / noqa suppressions

Intentional suppressions (django-stubs, drf-stubs, stripe stubs, celery, pydantic-settings, ruff) documented in `docs/type-ignores.md`. Don't remove them blindly.
