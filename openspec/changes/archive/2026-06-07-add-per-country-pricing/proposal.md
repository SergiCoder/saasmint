## Why

Today the catalog stores one USD amount per price and displays an FX-converted figure that **excludes tax**, while Stripe Checkout (`automatic_tax` ON) adds destination VAT on top. So an EU consumer sees `€19.99` and is charged `€23.99` — the displayed price lies, which is both poor UX and the wrong direction under EU consumer law (you may show more than you charge, never less). A single flat tax-inclusive sticker can't fix it cleanly because VAT rates differ by country (Spain 21% vs France 20%), so any one anchor drifts above the sticker somewhere. The proper fix is **per-country pricing**: each market gets its own round, tax-inclusive sticker that equals what the consumer pays — which also unlocks deliberate market-based price localization, not just tax correctness.

## What Changes

- **BREAKING (catalog model):** the pricing dimension moves from per-**currency** (FX-derived) to per-**country / tax-region**. France and Germany are both EUR but get independently-set prices. A per-country price row becomes the source of truth for a market.
- Per-country source of truth is a **round, tax-inclusive consumer sticker** (e.g. `€19.99`), settable per market. The Stripe price stays **`tax_behavior=exclusive`** with its base **derived** as `sticker / (1 + country_standard_vat_rate)`.
- Resulting behavior: consumers pay the sticker; cross-border B2B with a valid VIES/UK VAT ID pay the base (reverse charge); **domestic** B2B (e.g. Spanish NIF) correctly still pay IVA — no reverse charge; US/non-VAT pay the base (= sticker). Net varies slightly per market by design.
- **Enable `tax_id_collection` at checkout** (load-bearing — without it EU B2B is wrongly charged VAT). `automatic_tax` stays ON. Set `tax_behavior=exclusive` explicitly (today it is `unspecified`, riding the account default).
- **Country resolution before checkout** to select the right price: account billing country → locale → IP, with a manual country selector override and a USD fallback for countries without a row.
- Frontend pricing/checkout shows the per-country inclusive sticker with an **"incl. VAT"** label.
- Catalog seed/sync pipeline and runbook updated; non-trivial **operational prerequisites** (OSS / UK-VAT / US-nexus registrations) documented as deploy-blocking.

## Capabilities

### New Capabilities
<!-- none — this extends existing billing behavior -->

### Modified Capabilities
- `billing`: the catalog requirement changes from "USD amount + per-currency localized display" to "per-country tax-inclusive sticker as source of truth, with an exclusive Stripe base derived per country"; new requirements for country resolution, tax-inclusive display, `tax_id_collection`/reverse-charge behavior, and fallback to USD where no country row exists.

## Impact

- **core (Django, `apps/billing`)**: new per-country price model/dimension (extends or replaces `LocalizedPrice`); `seed_catalog` / `sync_localized_prices` / `sync_stripe_catalog` rework (derive exclusive base, mint per-country Stripe prices); checkout-session service gains `tax_id_collection` + explicit `tax_behavior=exclusive` + country→price selection; serializers expose the inclusive sticker; new VAT-rate source for the derivation; DB migration; `GET /billing/plans/` and currency/country endpoints.
- **app (Next.js)**: pricing page renders per-country sticker + "incl. VAT" label; country resolution/selector; gateway/serializer/domain `Price` model updates.
- **Stripe**: many more Price objects (per country × plan), all `tax_behavior=exclusive`; `tax_id_collection` enabled; VIES/HMRC validation relied upon.
- **Specs/docs**: `openspec/specs/billing/spec.md` requirement deltas; `core/CLAUDE.md` "Billing model" + "Updating prices" runbook (amount semantics net→derived, per-country dimension, derivation formula).
- **Operational (deploy-blocking, not code; not tax advice — confirm with accountant)**: OSS registration in Spain (note €10k cross-border B2C threshold), UK VAT registration for UK B2C, US state nexus registrations as thresholds are crossed; China VAT generally not collected at checkout by a foreign digital seller (withholding regime, outside Stripe Tax auto-calc) — verify.
