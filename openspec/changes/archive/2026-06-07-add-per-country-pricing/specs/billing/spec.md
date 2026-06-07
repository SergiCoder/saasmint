## MODIFIED Requirements

### Requirement: USD-anchored catalog with localized display

The catalog SHALL keep a USD `amount` (cents) per price as the fallback anchor, and SHALL additionally store a **per-country price row** whose source of truth is a **tax-inclusive consumer sticker** denominated in that country's display currency. Display endpoints SHALL resolve the caller's country and return that country's inclusive sticker as `display_amount`, **falling back to the USD `amount`** when no row exists for the resolved country. The `display_amount` shown to a consumer SHALL equal what that consumer pays at checkout (tax included), so the displayed price never understates the charged total.

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

## ADDED Requirements

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
