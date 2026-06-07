# billing

## Purpose

Defines how SaaSmint sells subscriptions and one-time products: a USD-anchored catalog with per-country tax-inclusive pricing (a derived exclusive Stripe base + reverse-charge for cross-border B2B), Stripe-mirrored subscriptions billed in either a personal or a team context, deferred-vs-immediate plan changes, and a credits ledger funded by one-time purchases. This capability spans the Django backend (`core/apps/billing`) and the Next.js frontend (`app`); requirements here describe behavior, not implementation. Operational runbooks (seeding the catalog, updating prices, tax registrations) live in `core/CLAUDE.md`.

## Requirements

### Requirement: USD-anchored catalog with localized display

The catalog SHALL keep a USD `amount` (cents) per price as the fallback anchor, and SHALL additionally store a **per-country price row** whose source of truth is a **tax-inclusive consumer sticker** denominated in that country's display currency. Display endpoints SHALL resolve the caller's country and return that country's inclusive sticker as `display_amount`, **falling back to the USD `amount`** when no row exists for the resolved country. The `display_amount` shown to a consumer SHALL equal what that consumer pays at checkout (tax included), so the displayed price never understates the charged total. A `?currency=` override continues to select the per-currency `LocalizedPrice` display when no per-country row applies.

#### Scenario: Display uses the resolved country's inclusive sticker

- **WHEN** a client requests `GET /api/v1/billing/plans/` and the resolved country is `ES`
- **THEN** each plan's `display_amount` is the Spain per-country tax-inclusive sticker
- **AND** the underlying USD `amount` is unchanged

#### Scenario: Missing country row falls back to USD

- **WHEN** the resolved country has no per-country price row
- **THEN** the response falls back to the USD `amount` for that price rather than erroring

#### Scenario: Displayed price equals the consumer checkout total

- **WHEN** a consumer in a country with a per-country sticker proceeds to checkout
- **THEN** the tax-inclusive total Stripe charges equals the `display_amount` previously shown for that country

### Requirement: Exclusive Stripe price derived from the inclusive sticker

For each per-country price the Stripe Price SHALL use `tax_behavior=exclusive`, with its `unit_amount` derived from the inclusive sticker as `round(sticker / (1 + country_standard_vat_rate))`. Checkout SHALL keep `automatic_tax` enabled so the destination tax computed on top of that exclusive base reproduces the inclusive sticker for a standard-rated consumer. The per-country net SHALL be allowed to vary by market by design.

#### Scenario: Base is derived so consumer pays the sticker

- **WHEN** a Spain sticker of `19.99` is synced at a 21% standard rate
- **THEN** the Stripe Price is created with `tax_behavior=exclusive` and `unit_amount` ≈ `19.99 / 1.21`
- **AND** a Spanish consumer's tax-inclusive checkout total is `19.99`

#### Scenario: Re-derivation on sticker or rate change

- **WHEN** a country's sticker or standard VAT rate changes and the catalog is re-synced
- **THEN** the exclusive `unit_amount` is recomputed from the new inputs

### Requirement: Country resolution for price selection

The system SHALL resolve a caller's pricing country in precedence order: the account's billing country, then the request locale, then IP geolocation, and SHALL allow a manual country override. When no country can be resolved or the resolved country has no row, the system SHALL use the USD anchor. The charge currency SHALL continue to follow the existing billing-vs-display-only currency rule independently of the resolved pricing country.

#### Scenario: Resolution precedence

- **WHEN** a logged-in caller has a billing country set
- **THEN** that billing country is used for price selection regardless of locale or IP

#### Scenario: Manual override wins

- **WHEN** a caller explicitly selects a different country
- **THEN** the selected country drives the displayed sticker and the Stripe Price used at checkout

#### Scenario: Unknown country falls back to USD

- **WHEN** no country can be resolved for a caller
- **THEN** the USD anchor price is displayed and used at checkout

### Requirement: Tax ID collection and reverse-charge behavior

Checkout SHALL enable `tax_id_collection` so business customers can supply a VAT/tax ID. With a valid cross-border EU (VIES) or UK VAT ID, the supply SHALL be reverse-charged — the customer pays the exclusive base with zero tax collected by SaaSmint. A domestic business (e.g. a Spanish NIF for a Spain-resolved sale) SHALL still be charged destination VAT (no reverse charge). A customer in a jurisdiction where no tax is collected SHALL pay the exclusive base.

#### Scenario: Cross-border EU business is reverse-charged

- **WHEN** a France-resolved business supplies a valid VIES VAT ID at checkout
- **THEN** zero VAT is collected and the customer is charged the exclusive base

#### Scenario: Domestic business is still taxed

- **WHEN** a Spain-resolved business supplies a valid Spanish NIF at checkout
- **THEN** Spanish IVA is still applied (no reverse charge) and the customer is charged the full inclusive sticker

#### Scenario: Non-VAT jurisdiction pays the base

- **WHEN** a customer resolved to a country where SaaSmint collects no tax checks out
- **THEN** the customer is charged the exclusive base with no tax added

### Requirement: Plan catalog structure

A plan SHALL be identified by `(context, tier, interval)` where `context` is `personal` or `team`, `tier` is `2=basic` or `3=pro` (`1=free` is reserved and not seeded), and `interval` is `month` or `year`. `GET /api/v1/billing/plans/` SHALL return only active paid plans in the DRF paginated envelope. The free tier SHALL be represented by the absence of a paid plan, not by a catalog row.

#### Scenario: List active paid plans

- **WHEN** a client requests `GET /api/v1/billing/plans/`
- **THEN** the response is a paginated `{count,next,previous,results}` envelope of active paid plans
- **AND** no `free` tier row is included

### Requirement: Subscriptions mirror Stripe state

Every `Subscription` row SHALL be a pure mirror of a Stripe subscription keyed by `stripe_id`, reconciled via webhooks. Absence of a row SHALL mean the free tier. `GET /api/v1/billing/subscriptions/me/` SHALL return a paginated envelope of 0–2 rows visible to the caller (at most one `personal` and one `team`).

#### Scenario: Free-tier caller has no subscription row

- **WHEN** a caller with no paid subscription requests `GET /api/v1/billing/subscriptions/me/`
- **THEN** the paginated envelope contains zero rows

#### Scenario: Concurrent personal and team billing

- **WHEN** a caller bills both a personal subscription and a team subscription
- **THEN** `GET /api/v1/billing/subscriptions/me/` returns exactly two rows, one per context

### Requirement: Billing context selection and authorization

Subscription mutations and product checkout SHALL accept `?context=personal|team`. When the caller can act in both contexts the parameter SHALL be required; otherwise it SHALL default to `team` for org members and `personal` for everyone else. A `?context=team` subscription mutation SHALL require `is_billing=True` on an active org membership; a `?context=team` product checkout SHALL require the `OWNER` role.

#### Scenario: Default context for an org member

- **WHEN** an org member issues a subscription mutation without `?context=`
- **THEN** the mutation defaults to the `team` context

#### Scenario: Team mutation without billing permission is rejected

- **WHEN** a caller issues a `?context=team` subscription mutation without `is_billing=True`
- **THEN** the request is rejected with a `400`-class error and no Stripe call is made

#### Scenario: Team product checkout requires owner

- **WHEN** a non-owner org member requests `POST /api/v1/billing/product-checkout-sessions/?context=team`
- **THEN** the request is rejected because product checkout in the team context requires `OWNER`

### Requirement: Subscription checkout

`POST /api/v1/billing/checkout-sessions/` SHALL create a Stripe Checkout Session (`mode=subscription`) for the resolved context and return `201 Created`. A team checkout SHALL require an `org_name`. The endpoint SHALL reject an invalid plan price and SHALL reject a caller who already owns an organization from starting a second one.

#### Scenario: Personal subscription checkout

- **WHEN** a caller posts a valid `plan_price_id` for the personal context
- **THEN** the response is `201` with a Stripe Checkout Session reference

#### Scenario: Team checkout missing org name

- **WHEN** a team checkout is requested without `org_name`
- **THEN** the request fails validation with a `400`-class error

#### Scenario: Caller already owns an organization

- **WHEN** a caller who already owns an org requests a team checkout
- **THEN** the request is rejected with a `409`-class conflict

### Requirement: Immediate upgrades and deferred downgrades

`PATCH /api/v1/billing/subscriptions/me/` SHALL apply an upgrade or same-amount switch immediately. When the new `plan_price_id` has an amount below the current price, the system SHALL instead create a Stripe `SubscriptionSchedule` that switches at period end and SHALL mirror the pending switch onto `scheduled_plan` and `scheduled_change_at`. `DELETE /api/v1/billing/subscriptions/me/scheduled-change/` SHALL release an active schedule, leaving the caller on the current plan.

#### Scenario: Upgrade applies immediately

- **WHEN** a caller PATCHes to a higher-amount `plan_price_id`
- **THEN** the plan changes immediately and `scheduled_plan`/`scheduled_change_at` remain unset

#### Scenario: Downgrade defers to period end

- **WHEN** a caller PATCHes to a lower-amount `plan_price_id`
- **THEN** a Stripe `SubscriptionSchedule` is created (current → period end → new price)
- **AND** `scheduled_plan` and `scheduled_change_at` reflect the pending switch
- **AND** the active plan does not change until `current_period_end`

#### Scenario: Release a scheduled change

- **WHEN** a caller calls `DELETE /api/v1/billing/subscriptions/me/scheduled-change/`
- **THEN** the schedule is released and `scheduled_plan`/`scheduled_change_at` are cleared
- **AND** the caller keeps the current plan

### Requirement: Cancel and resume with immediate local write-back

`DELETE /api/v1/billing/subscriptions/me/` SHALL schedule cancellation at period end (`cancel_at`), distinct from `canceled_at` which only reflects an ended subscription. Cancel, resume, and schedule-release mutations SHALL write the resulting state back to the local mirror before returning, so a subsequent read reflects the new state without waiting for the webhook.

#### Scenario: Cancel reflects immediately on read-back

- **WHEN** a caller cancels a subscription and then immediately reads it
- **THEN** the subscription shows `cancel_at` set (scheduled to cancel) without waiting for the Stripe webhook
- **AND** `canceled_at` remains unset until the subscription actually ends

### Requirement: One-time products and idempotent credit grants

`GET /api/v1/billing/products/` SHALL list active one-time products in the paginated envelope. `POST /api/v1/billing/product-checkout-sessions/` SHALL create a Stripe Checkout Session (`mode=payment`). On checkout completion the system SHALL grant credits via an immutable `CreditTransaction` (unique on `stripe_session_id`) and update the denormalized `CreditBalance`. `GET /api/v1/billing/credits/me/` SHALL return `{balances:[...]}` with 0–2 rows (user and/or org), each balance a non-negative integer, in backend order.

#### Scenario: Completed purchase grants credits exactly once

- **WHEN** a product checkout completes and its webhook is delivered (possibly more than once)
- **THEN** credits are granted via a `CreditTransaction` unique on `stripe_session_id`
- **AND** redelivery of the same session does not double-grant

#### Scenario: Read current balances

- **WHEN** a caller requests `GET /api/v1/billing/credits/me/`
- **THEN** the response is `{balances:[...]}` with up to two non-negative balances rendered in backend order

### Requirement: Billing currencies vs display-only currencies

The system SHALL distinguish `BILLING_CURRENCIES` (currencies Stripe actually charges in) from display-only currencies (in `SUPPORTED_CURRENCIES` but not billable). For a billable currency the Stripe Price used at checkout SHALL match that currency; for a display-only currency checkout SHALL charge in USD even though the displayed amount may be localized. `GET /api/v1/billing/currencies/` SHALL report which currencies are billable versus display-only.

#### Scenario: Checkout in a display-only currency charges USD

- **WHEN** a caller checks out while viewing a display-only currency
- **THEN** Stripe charges in USD
- **AND** the Stripe Price used matches the currency actually charged, so display never drives a wrong-currency charge

#### Scenario: Checkout in a billable currency charges that currency

- **WHEN** a caller checks out in a currency listed in `BILLING_CURRENCIES`
- **THEN** Stripe charges in that currency using the matching localized Stripe Price

### Requirement: Personal and team customer isolation

Personal and team subscriptions SHALL live on distinct Stripe customers to isolate invoicing (separate tax IDs, addresses, receipts, and payment methods per scope). A team checkout SHALL mint a fresh org-scoped Stripe customer, persisted alongside the org and its owner on webhook. A personal→team upgrade SHALL honor a `keep_personal_subscription` flag controlling whether the existing personal subscription is scheduled to cancel at period end.

#### Scenario: Team checkout uses a distinct customer

- **WHEN** a caller completes a team checkout
- **THEN** the team subscription is billed to an org-scoped Stripe customer distinct from any personal customer

#### Scenario: Personal subscription cancellation on team upgrade

- **WHEN** a caller upgrades from personal to team with `keep_personal_subscription=false`
- **THEN** the existing personal subscription is scheduled to cancel at period end

### Requirement: Billing portal access

`POST /api/v1/billing/portal-sessions/` SHALL create a Stripe Billing Portal session for the caller's resolved context so they can manage payment methods, invoices, and cancellation outside the application.

#### Scenario: Open the billing portal

- **WHEN** a caller with a Stripe customer requests `POST /api/v1/billing/portal-sessions/`
- **THEN** the response references a Stripe Billing Portal session for the caller's context
