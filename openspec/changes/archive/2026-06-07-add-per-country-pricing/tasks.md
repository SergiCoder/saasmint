## 1. Data model & rate table

- [x] 1.1 Add `CountryPrice` model (`apps/billing/models.py`): FK to `PlanPrice`/`ProductPrice`, `country` (ISO-3166-1 alpha-2), `currency`, `sticker_minor` (tax-inclusive source of truth), derived `base_minor`, `stripe_price_id`; unique on `(price, country)`.
- [x] 1.2 Add a maintained standard-VAT-rate table (country → rate) used only for base derivation; document it as authoritative-for-derivation-only (Stripe Tax is authoritative at checkout).
- [x] 1.3 Generate and review the DB migration (do not hand-edit).
- [x] 1.4 Add a pure helper `derive_base(sticker_minor, vat_rate) -> base_minor` with rounding to the nearest minor unit; unit-test the rounding (incl. zero-rate and ≤1-cent drift cases).

## 2. Seed / localize / sync pipeline

- [x] 2.1 Seed initial `CountryPrice` stickers for ES, FR, DE, UK, US, CN (round numbers) and any EU/OSS markets in `seed_catalog` (idempotent).
- [x] 2.2 Extend `sync_localized_prices` to compute a *suggested* per-country sticker from the FX feed without overwriting human-curated `sticker_minor`.
- [x] 2.3 Update `sync_stripe_catalog`: set `tax_behavior="exclusive"` explicitly on new prices; in the "price matches" branch, `Price.modify(..., tax_behavior="exclusive")` for existing `unspecified` prices (do NOT add `tax_behavior` to `_price_matches`).
- [x] 2.4 Mint per-country Stripe Prices from `derive_base(sticker, rate)`, stamping `CountryPrice.stripe_price_id` (idempotent via `lookup_key`).
- [x] 2.5 Verify entrypoint ordering still holds (`migrate` → seed → localize → sync) and the new step reads curated stickers.

## 3. Country resolution & checkout

- [x] 3.1 Implement country resolution: account billing country → locale → IP → manual override → USD fallback.
- [x] 3.2 Select the per-country Stripe Price (or USD fallback) when creating subscription and product checkout sessions.
- [x] 3.3 Enable `tax_id_collection: {enabled: true}` on checkout-session creation; keep `automatic_tax` and `customer_update: {address: auto}`.
- [x] 3.4 Preserve `201 Created` + `Location` header on all session creators (refactoring guardrail).

## 4. API & serializers

- [x] 4.1 Update plan/product serializers so `display_amount` is the resolved country's tax-inclusive sticker, falling back to USD; expose a tax-inclusive flag/label hint.
- [x] 4.2 Resolve country for `GET /billing/plans/` and `GET /billing/products/` (server-side; optional `?country=` override).
- [x] 4.3 Run `make schema` to regenerate `schema.yml` after endpoint/response changes.

## 5. Frontend (app)

- [x] 5.1 Update domain `Price` model + gateway/serializer to carry the inclusive sticker and tax-inclusive flag.
- [x] 5.2 Pricing page renders the per-country sticker with an "incl. VAT" label.
- [x] 5.3 Country resolution + manual country selector on the pricing/checkout flow.

## 6. Specs, docs & tests

- [x] 6.1 Sync `openspec/specs/billing/spec.md` with the change's spec deltas.
- [x] 6.2 Update `core/CLAUDE.md` "Billing model" + "Updating prices": per-country dimension, sticker→base derivation formula, `tax_behavior=exclusive`, `tax_id_collection`, country resolution.
- [x] 6.3 Backend tests: base derivation, per-country price selection, USD fallback, reverse-charge vs domestic-tax behavior, `tax_id_collection` enabled.
- [x] 6.4 Frontend tests: per-country sticker display + "incl. VAT" label + country selector.
- [x] 6.5 Run `make lint`, `make typecheck`, `make test` across both stacks.

## 7. Operational prerequisites (deploy-blocking — not code; confirm with accountant)

- [ ] 7.1 OSS registration in Spain for EU B2C VAT (note €10k cross-border threshold); add Stripe Tax registration.
- [ ] 7.2 UK VAT registration for UK B2C; add Stripe Tax registration.
- [ ] 7.3 Review US state nexus exposure; register where thresholds are crossed.
- [ ] 7.4 Confirm China collection treatment for a foreign digital seller; keep as 0% collected until verified.
- [ ] 7.5 Launch gating: flip a country live only once its registration exists; keep others on USD fallback.
