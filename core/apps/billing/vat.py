"""Standard VAT/GST rate table and the inclusive→exclusive base derivation.

Per-country pricing stores a human-set, tax-**inclusive** consumer sticker as
the source of truth (e.g. ``€19.99``). The Stripe Price ``unit_amount`` is the
tax-**exclusive** base derived from that sticker by :func:`derive_base`, kept at
``tax_behavior=exclusive`` so ``automatic_tax`` adds destination VAT back on top
and a standard-rated consumer's checkout total lands on the sticker again.

The rates here are authoritative **only for that derivation** — they make the
exclusive base deterministic and reproducible inside ``sync_stripe_catalog``.
**Stripe Tax remains authoritative for the tax actually charged at checkout**
(reduced rates, cross-border reverse charge, US state nexus, etc.). Reconcile
this table against Stripe Tax periodically. This is not tax advice.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

# ISO 3166-1 alpha-2 country → standard VAT/GST rate, as a fraction of the base.
# EU-27 members are reachable via Spain's OSS registration; GB needs a standalone
# UK VAT registration post-Brexit. Untracked countries fall back to the USD
# anchor and are never derived from this table.
STANDARD_VAT_RATES: dict[str, Decimal] = {
    # ── EU-27 (sold to via OSS) ──
    "AT": Decimal("0.20"),
    "BE": Decimal("0.21"),
    "BG": Decimal("0.20"),
    "HR": Decimal("0.25"),
    "CY": Decimal("0.19"),
    "CZ": Decimal("0.21"),
    "DK": Decimal("0.25"),
    "EE": Decimal("0.22"),
    "FI": Decimal("0.255"),
    "FR": Decimal("0.20"),
    "DE": Decimal("0.19"),
    "GR": Decimal("0.24"),
    "HU": Decimal("0.27"),
    "IE": Decimal("0.23"),
    "IT": Decimal("0.22"),
    "LV": Decimal("0.21"),
    "LT": Decimal("0.21"),
    "LU": Decimal("0.17"),
    "MT": Decimal("0.18"),
    "NL": Decimal("0.21"),
    "PL": Decimal("0.23"),
    "PT": Decimal("0.23"),
    "RO": Decimal("0.19"),
    "SK": Decimal("0.23"),
    "SI": Decimal("0.22"),
    "ES": Decimal("0.21"),
    "SE": Decimal("0.25"),
    # ── United Kingdom (standalone UK VAT registration) ──
    "GB": Decimal("0.20"),
    # ── Jurisdictions where SaaSmint collects no tax at checkout ──
    # US: 0% until an economic-nexus registration exists per taxing state.
    "US": Decimal("0"),
    # CN: a foreign digital seller does not collect Chinese VAT at checkout
    # (withholding regime, outside Stripe Tax auto-calc).
    "CN": Decimal("0"),
}


# Eurozone members that price in EUR. Used to map a country to its display
# currency when seeding per-country stickers; other markets list their own.
_EUROZONE: frozenset[str] = frozenset(
    {
        "AT",
        "BE",
        "HR",
        "CY",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "IE",
        "IT",
        "LV",
        "LT",
        "LU",
        "MT",
        "NL",
        "PT",
        "SK",
        "SI",
        "ES",
    }
)

# ISO 3166-1 alpha-2 country → display/charge currency for its per-country price.
# Only countries whose currency is in ``SUPPORTED_CURRENCIES`` get a row at
# launch; everything else uses the USD anchor (see design D8 — expand by adding
# rows, no migration needed). EU members not listed here (CZ/HU/RO/BG) have no
# supported native currency yet and stay on the USD fallback until added.
COUNTRY_CURRENCY: dict[str, str] = {
    **dict.fromkeys(_EUROZONE, "eur"),
    "DK": "dkk",
    "SE": "sek",
    "PL": "pln",
    "GB": "gbp",
    "US": "usd",
    "CN": "cny",
}


def standard_vat_rate(country: str) -> Decimal:
    """Standard rate for *country* (ISO-3166-1 alpha-2), or ``0`` when untracked.

    A zero rate is the correct derivation default for non-VAT jurisdictions and
    for any country we have not added to :data:`STANDARD_VAT_RATES` (those use
    the USD anchor and would not get a derived per-country base anyway).
    """
    return STANDARD_VAT_RATES.get(country.upper(), Decimal("0"))


def derive_base(sticker_minor: int, vat_rate: Decimal) -> int:
    """Derive the tax-exclusive Stripe base (minor units) from an inclusive sticker.

    ``base = round(sticker / (1 + rate))`` with half-up rounding to the nearest
    minor unit. A zero rate returns the sticker unchanged (the base *is* the
    sticker for non-VAT jurisdictions). Accepts ≤1-minor-unit rounding drift
    between the derived base and Stripe's exact destination calculation.
    """
    if sticker_minor < 0:
        raise ValueError("sticker_minor must be non-negative")
    if vat_rate < 0:
        raise ValueError("vat_rate must be non-negative")
    if vat_rate == 0:
        return sticker_minor
    base = Decimal(sticker_minor) / (Decimal(1) + vat_rate)
    return int(base.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
