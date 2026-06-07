## Context

The catalog stores one USD `amount` per price (`PlanPrice`/`ProductPrice`) and derives per-**currency** display rows (`LocalizedPrice`) from an FX feed. Stripe Prices are currently `tax_behavior=unspecified` (riding the Stripe account default, effectively exclusive) and checkout runs with `automatic_tax` ON but `tax_id_collection` OFF.

Symptom that started this: an EU consumer sees the FX-converted, **tax-exclusive** figure (e.g. `€19.99`) but Stripe adds destination VAT, charging `€23.99`. Displaying less than you charge is the wrong direction under EU consumer law.

Explored alternatives and why they were rejected:
- **`tax_behavior=inclusive`** — Stripe does **not** reduce an inclusive price for a reverse-charge business; a French B2B would pay the full inclusive amount. Loses the B2B reduction.
- **Single flat inclusive sticker** — VAT rates differ by country, so a sticker anchored to one rate drifts *above* itself elsewhere (Spain 21% consumer pays `20.16` against a `19.99` sticker) — the compliance-wrong direction. Anchoring to the max rate fixes direction but sacrifices net and still under-charges everyone below the max.

Decision: model price **per country (tax region)**, not per currency. France and Germany are both EUR but need independent prices. This also unlocks deliberate market-based price localization, not just tax correctness.

Constraints: monorepo, one `billing` capability spanning `core/apps/billing` (Django) and `app` (Next.js). Stripe API pinned to `2026-05-27.dahlia`. The seed → localize → sync pipeline runs from `infra/entrypoint.sh` on every deploy. **This is not tax advice** — registrations and thresholds must be confirmed with an accountant.

## Goals / Non-Goals

**Goals:**
- Each market shows a round, **tax-inclusive** sticker that equals the consumer's checkout total.
- Cross-border EU/UK **B2B** customers with a valid VAT ID get the reverse-charge reduction; **domestic** B2B are correctly still taxed.
- Per-country prices are deliberately settable (price localization), with a safe USD fallback for uncovered countries.
- Net is predictable per market (variation across markets is accepted and intentional).

**Non-Goals:**
- No move to `tax_behavior=inclusive` (it breaks B2B reverse charge).
- No attempt to make a *single* sticker exact in every country.
- No automated tax **remittance/registration** — those are operational prerequisites, not code.
- No change to subscription lifecycle, credits, or context-selection behavior.

## Decisions

### D1 — Per-country source of truth is the inclusive sticker; the Stripe base is derived
Store the **tax-inclusive consumer sticker** per country as the human-set source of truth. Derive the Stripe Price `unit_amount` (kept `tax_behavior=exclusive`) as `round(sticker / (1 + country_standard_vat_rate))`. Consumers pay the sticker (base + destination VAT); reverse-charge B2B pay the base; non-VAT pay the base.
- *Why not store the net base and display base×(1+rate)?* The displayed number wouldn't be round, defeating the purpose. Storing the sticker keeps the consumer-facing number clean and gives full price-localization control.
- *Why not `tax_behavior=inclusive`?* No B2B reduction (see Context).

### D2 — Keep prices `tax_behavior=exclusive`, set it explicitly
All Stripe Prices today are `unspecified`. Set `tax_behavior=exclusive` explicitly in `sync_stripe_catalog` so behavior is version-controlled and independent of the dashboard account default. Because current prices are `unspecified`, this is the allowed one-time transition (`unspecified → exclusive`) with no price churn; the idempotent sync becomes the migration. Do **not** add `tax_behavior` to `_price_matches` (that would force archive+recreate); instead modify-in-place in the "price matches" branch.

### D3 — `tax_id_collection` is mandatory, not optional
Enable `tax_id_collection: {enabled: true}` on checkout sessions. It is load-bearing: without it Stripe can't see a business's VAT ID, treats EU B2B as B2C, and **wrongly charges VAT**. `automatic_tax` and `customer_update: {address: auto}` stay on (address is needed for both rate calc and VIES/HMRC validation).

### D4 — Country resolution precedence
Resolve pricing country: **account billing country → request locale → IP geolocation → manual override → USD fallback**. The country must be known *before* checkout to select the Price (Stripe confirms tax country at the payment page from the entered address; the up-front country only selects which Price/sticker is shown and used). Charge **currency** continues to follow the existing `BILLING_CURRENCIES` vs display-only rule, orthogonal to pricing country.

### D5 — Data model: new `CountryPrice` rather than overloading `LocalizedPrice`
Add a `CountryPrice` (FK to `PlanPrice`/`ProductPrice`, `country` ISO-3166, `sticker_minor`, `currency`, `stripe_price_id`, derived `base_minor`). Keep `LocalizedPrice` for currency-display fallback during transition. *Why a new model:* country (tax region) and currency are different axes; conflating them in `LocalizedPrice` (keyed by currency) would muddy both. Long-term `LocalizedPrice` may be retired once every market has a `CountryPrice`.

### D6 — VAT-rate source for derivation: maintained rate table, reconciled against Stripe
Keep a small **maintained standard-rate table** (country → standard VAT rate) used only to derive the exclusive base from the sticker. Stripe Tax remains the authority for the *actual* tax charged at checkout. Rationale: the derivation must be deterministic and reproducible in `sync_stripe_catalog`; reading live rates from Stripe at sync time is fragile. Accept tiny rounding drift between derived base and Stripe's exact calc (cents).

### D7 — FX still seeds, humans curate
`sync_localized_prices` (FX) continues to compute a *suggested* per-country sticker as a starting point; the stored `CountryPrice.sticker_minor` is human-curatable (round numbers, market positioning) and is not overwritten once set. *Why:* preserves automation for new markets while allowing deliberate localization.

### D8 — Initial country coverage
Explicit `CountryPrice` rows for **ES, FR, DE, UK, US, CN** at launch, plus EU members sold to via OSS, with **USD fallback** everywhere else. Expand by adding rows; no migration needed per added country.

Worked examples below assume an illustrative round sticker of `19.99` per country (in that country's display currency) and a **Spain-established** merchant. `base = round(sticker / (1 + rate))`; the consumer always pays the sticker; cross-border EU/UK B2B with a valid VAT ID is reverse-charged and pays the base; **domestic** (Spanish) B2B is *not* reverse-charged. Net = base, so it varies per market **by design**.

| Country | Rate | Customer | Sees (sticker) | Pays | You net |
|---|---|---|---|---|---|
| 🇪🇸 ES | IVA 21% | B2C | 19.99 | **19.99** | 16.52 |
| 🇪🇸 ES | IVA 21% (domestic) | B2B (NIF ✓) | 19.99 | **19.99** ◄ *not* reduced | 16.52 |
| 🇫🇷 FR | TVA 20% | B2C | 19.99 | **19.99** | 16.66 |
| 🇫🇷 FR | reverse charge | B2B (VIES ✓) | 19.99 | **16.66** ◄ reduced | 16.66 |
| 🇩🇪 DE | VAT 19% | B2C | 19.99 | **19.99** | 16.80 |
| 🇩🇪 DE | reverse charge | B2B (VIES ✓) | 19.99 | **16.80** ◄ reduced | 16.80 |
| 🇬🇧 UK | VAT 20%³ | B2C | 19.99 | **19.99**³ | 16.66 |
| 🇬🇧 UK | reverse charge | B2B (UK VAT ✓) | 19.99 | **16.66** ◄ reduced | 16.66 |
| 🇺🇸 US | none¹ | B2C | 19.99 | **19.99** | 19.99 |
| 🇺🇸 US | none¹ | B2B | 19.99 | **19.99** | 19.99 |
| 🇨🇳 CN | not collected² | B2C | 19.99 | **19.99** | 19.99 |
| 🇨🇳 CN | not collected² | B2B | 19.99 | **19.99** | 19.99 |

¹ US = 0% only while there is no economic nexus; once registered in a taxing state, US B2C pays `base + state rate` and US B2B is often exempt with a resale/exemption certificate.
² China: a foreign digital seller generally does not collect Chinese VAT at checkout (withholding regime, outside Stripe Tax auto-calc) — verify with an accountant.
³ UK B2C requires a **standalone UK VAT registration** — the EU OSS scheme does **not** cover the UK post-Brexit. Until it exists, a UK consumer is `not_collecting` and pays only the base (no 20% VAT). See prerequisite "UK VAT registration"; UK B2B is reverse-charged regardless.

**Validated in Stripe test mode (Tax Calculation API, 2026-06-07).** With the account's `es:standard` + `es:oss_union` registrations: ES B2C and ES-NIF B2B both compute `standard_rated` 21% (domestic, *not* reduced); FR B2C 20% and FR B2B `reverse_charge`; DE B2C 19% and DE B2B `reverse_charge`; US `not_collecting`. Every EU consumer total derived from `round(sticker/(1+rate))` lands exactly on the 19.99 sticker, confirming D1 and D3. The UK consumer returned `not_collecting` — surfacing footnote ³ above.

## Risks / Trade-offs

- **Operational prerequisites are deploy-blocking** → Going live with inclusive EU pricing without registrations means calculating tax you can't legally remit. Mitigation: gate launch on the prerequisites checklist below; ship behind the USD fallback until registrations exist.
- **Rounding drift** between derived base and Stripe's exact destination calc → cents-level mismatch vs the sticker. Mitigation: round the base to the nearest minor unit; accept ≤1-cent drift; document it.
- **Country misdetection** (IP vs entered address) → shown sticker may differ from the Stripe tax country. Mitigation: prefer account billing country; allow manual override; the entered checkout address is authoritative for tax.
- **Many more Stripe Prices** (country × plan × interval) → catalog bloat and sync time. Mitigation: bulk `Price.list` lookups already batched; archive superseded prices.
- **Net varies by market** (intended) → blended margin depends on country mix. Mitigation: this is a conscious pricing choice; surface per-country net in the runbook.
- **China** → foreign digital sellers generally don't collect Chinese VAT at checkout (withholding regime, outside Stripe Tax auto-calc). Mitigation: treat as 0% collected; verify with accountant.

## Migration Plan

1. Add `CountryPrice` model + migration; backfill suggested stickers from FX for the initial country set.
2. Curate launch stickers (round numbers) for ES/FR/DE/UK/US/CN.
3. Update `sync_stripe_catalog`: explicit `tax_behavior=exclusive` (modify-in-place for existing `unspecified` prices), mint per-country Prices from derived bases.
4. Enable `tax_id_collection` + explicit `tax_behavior` on checkout-session creation.
5. Update serializers/gateway/frontend to resolve country and show the inclusive sticker + "incl. VAT" label.
6. Roll out behind USD fallback; flip a country live only once its registration is in place.
- **Rollback:** prices remain `exclusive` and valid; reverting the frontend to the USD/old display and disabling `tax_id_collection` restores prior behavior without Stripe price churn.

### Operational prerequisites (NOT code — confirm with an accountant; not tax advice)
- **OSS registration in Spain** to remit EU B2C VAT (note the **€10,000** cross-border B2C threshold below which home-country IVA may apply instead).
- **UK VAT registration** for UK B2C (no threshold for non-established suppliers of digital services).
- **US state nexus registrations** as economic-nexus thresholds are crossed (SaaS taxability varies by state).
- **China**: confirm no checkout-time collection obligation for a foreign digital seller.

## Open Questions

- Final standard-rate table contents and update cadence (who owns it, how reconciled against Stripe Tax).
- Whether `?country=` becomes an explicit query param alongside `?currency=`, or country is purely resolved server-side.
- Exact retirement path for `LocalizedPrice` once `CountryPrice` covers all live markets.
- Whether product/credit one-time prices need different rounding rules than subscriptions.
