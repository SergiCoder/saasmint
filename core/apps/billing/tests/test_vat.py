"""Unit tests for the VAT rate table and inclusive→exclusive base derivation."""

from __future__ import annotations

from decimal import Decimal

import pytest

from apps.billing.vat import (
    STANDARD_VAT_RATES,
    derive_base,
    standard_vat_rate,
)


class TestDeriveBase:
    @pytest.mark.parametrize(
        ("sticker_minor", "rate", "expected_base"),
        [
            # Worked examples from design D8 (sticker 19.99 in minor units).
            (1999, Decimal("0.21"), 1652),  # ES IVA 21% → net 16.52
            (1999, Decimal("0.20"), 1666),  # FR/UK 20%  → net 16.66
            (1999, Decimal("0.19"), 1680),  # DE 19%     → net 16.80
            # Zero rate: base IS the sticker (US/CN/non-VAT).
            (1999, Decimal("0"), 1999),
            # Half-up rounding to the nearest minor unit.
            (100, Decimal("0.21"), 83),  # 100 / 1.21 = 82.64 → 83
            (121, Decimal("0.21"), 100),  # exact
        ],
    )
    def test_derives_expected_base(
        self, sticker_minor: int, rate: Decimal, expected_base: int
    ) -> None:
        assert derive_base(sticker_minor, rate) == expected_base

    def test_round_trip_drift_within_one_minor_unit(self) -> None:
        """Re-grossing the derived base lands within ≤1 minor unit of the sticker."""
        for sticker in range(1, 10001):
            for rate in (Decimal("0.19"), Decimal("0.20"), Decimal("0.21"), Decimal("0.27")):
                base = derive_base(sticker, rate)
                regrossed = base * (1 + rate)
                assert abs(regrossed - sticker) <= 1

    def test_zero_sticker(self) -> None:
        assert derive_base(0, Decimal("0.21")) == 0

    def test_rejects_negative_sticker(self) -> None:
        with pytest.raises(ValueError, match="sticker_minor must be non-negative"):
            derive_base(-1, Decimal("0.21"))

    def test_rejects_negative_rate(self) -> None:
        with pytest.raises(ValueError, match="vat_rate must be non-negative"):
            derive_base(1999, Decimal("-0.10"))


class TestStandardVatRate:
    def test_known_country_case_insensitive(self) -> None:
        assert standard_vat_rate("es") == Decimal("0.21")
        assert standard_vat_rate("ES") == Decimal("0.21")

    def test_non_vat_jurisdiction_is_zero(self) -> None:
        assert standard_vat_rate("US") == Decimal("0")
        assert standard_vat_rate("CN") == Decimal("0")

    def test_untracked_country_defaults_to_zero(self) -> None:
        assert standard_vat_rate("ZZ") == Decimal("0")

    def test_uk_uses_gb_iso_code(self) -> None:
        assert "GB" in STANDARD_VAT_RATES
        assert standard_vat_rate("GB") == Decimal("0.20")
