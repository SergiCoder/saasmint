"""Tests for per-country (tax-region) pricing.

Covers the seed → FX-suggest → Stripe-mint pipeline for ``CountryPrice`` rows,
country resolution precedence, the tax-inclusive sticker on the catalog API, and
per-country Stripe Price selection at checkout. Stripe is mocked throughout.
"""

from __future__ import annotations

from datetime import UTC, datetime
from io import StringIO
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from django.core.management import call_command
from rest_framework.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.billing.models import CountryPrice, Plan, PlanPrice, Product, ProductPrice
from apps.billing.tests.conftest import fx_response
from apps.billing.views import _country_from_locale, _resolve_pricing_country
from apps.users.models import User

pytestmark = pytest.mark.django_db


# ── seed_catalog → CountryPrice rows ────────────────────────────────────────


class TestSeedCountryPrices:
    def test_seeds_launch_country_rows_with_derived_base(self):
        call_command("seed_catalog", stdout=StringIO())
        basic = PlanPrice.objects.get(plan__name="Personal Basic", plan__interval="month")

        es = CountryPrice.objects.get(plan_price=basic, country="ES")
        assert es.currency == "eur"
        # Sticker reuses the USD amount as the local round number; base derived.
        assert es.sticker_minor == basic.amount
        assert es.base_minor == round(basic.amount / 1.21)
        assert es.is_curated is False

        us = CountryPrice.objects.get(plan_price=basic, country="US")
        # Zero-rate jurisdiction: base == sticker.
        assert us.currency == "usd"
        assert us.base_minor == us.sticker_minor

    def test_idempotent_keeps_curated_sticker_but_realigns_base(self):
        call_command("seed_catalog", stdout=StringIO())
        basic = PlanPrice.objects.get(plan__name="Personal Basic", plan__interval="month")
        es = CountryPrice.objects.get(plan_price=basic, country="ES")
        es.sticker_minor = 2499
        es.base_minor = 0  # deliberately stale
        es.is_curated = True
        es.save()

        call_command("seed_catalog", stdout=StringIO())
        es.refresh_from_db()
        # Curated sticker preserved; base re-derived from it.
        assert es.sticker_minor == 2499
        assert es.base_minor == round(2499 / 1.21)
        assert es.is_curated is True


# ── sync_localized_prices → FX-suggested stickers (respects is_curated) ──────


class TestCountrySuggestionRefresh:
    def _fx(self):
        return fx_response({"eur": 0.90, "gbp": 0.80, "cny": 7.0})

    def test_refreshes_uncurated_but_not_curated(self):
        plan = Plan.objects.create(
            name="Pro", context="personal", tier=3, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_pro", amount=2000)
        uncurated = CountryPrice.objects.create(
            plan_price=pp,
            country="FR",
            currency="eur",
            sticker_minor=2000,
            base_minor=1667,
            is_curated=False,
        )
        curated = CountryPrice.objects.create(
            plan_price=pp,
            country="DE",
            currency="eur",
            sticker_minor=1999,
            base_minor=1680,
            is_curated=True,
        )

        from apps.billing.tasks import sync_localized_prices

        with patch("apps.billing.tasks.httpx.get", return_value=self._fx()):
            sync_localized_prices()

        uncurated.refresh_from_db()
        curated.refresh_from_db()
        # FR (uncurated) is refreshed to the FX suggestion (20.00 → 18.00 @0.90,
        # friendly-rounded to 17.99) and its base re-derived at FR's 20%.
        assert uncurated.sticker_minor == 1799
        assert uncurated.base_minor == round(1799 / 1.20)
        # DE (curated) is untouched.
        assert curated.sticker_minor == 1999
        assert curated.base_minor == 1680


# ── sync_stripe_catalog → per-country exclusive Prices ──────────────────────


class TestSyncCountryStripePrices:
    @pytest.fixture(autouse=True)
    def _usd_only(self, settings):
        settings.BILLING_CURRENCIES = ["usd"]

    def test_mints_exclusive_per_country_price_and_stamps_id(self):
        plan = Plan.objects.create(
            name="Solo", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd", amount=1999)
        cp = CountryPrice.objects.create(
            plan_price=pp,
            country="ES",
            currency="eur",
            sticker_minor=1999,
            base_minor=1652,
            is_curated=True,
        )

        created_prices = iter(
            [SimpleNamespace(id="price_usd_new"), SimpleNamespace(id="price_es_new")]
        )

        def _price_create(**kwargs):
            return next(created_prices)

        with (
            patch("stripe.Price.list", return_value=MagicMock(data=[])),
            patch("stripe.Product.create", return_value=SimpleNamespace(id="prod_x")),
            patch("stripe.Price.create", side_effect=_price_create) as mock_create,
            patch("stripe.Product.modify"),
            patch("stripe.Price.modify"),
        ):
            call_command("sync_stripe_catalog", stdout=StringIO(), stderr=StringIO())

        # The per-country create carries the derived exclusive base + currency.
        country_call = next(c for c in mock_create.call_args_list if c.kwargs["currency"] == "eur")
        assert country_call.kwargs["unit_amount"] == 1652
        assert country_call.kwargs["tax_behavior"] == "exclusive"
        assert country_call.kwargs["lookup_key"] == "plan_personal_basic_month_c_es"
        assert country_call.kwargs["metadata"]["country"] == "ES"

        cp.refresh_from_db()
        assert cp.stripe_price_id == "price_es_new"


# ── CountryPrice.recompute_base ─────────────────────────────────────────────


class TestCountryPriceRecomputeBase:
    def test_recompute_base_applies_standard_vat_rate(self):
        plan = Plan.objects.create(
            name="Basic", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd", amount=1999)
        cp = CountryPrice(
            plan_price=pp,
            country="ES",
            currency="eur",
            sticker_minor=1999,
            base_minor=0,  # stale/wrong
        )
        result = cp.recompute_base()
        # ES VAT = 21%, 1999 / 1.21 = 1652.07 → rounds to 1652
        assert result == 1652
        assert cp.base_minor == 1652

    def test_recompute_base_zero_rate_returns_sticker(self):
        plan = Plan.objects.create(
            name="Basic US", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd_us", amount=1999)
        cp = CountryPrice(
            plan_price=pp,
            country="US",
            currency="usd",
            sticker_minor=1999,
            base_minor=0,
        )
        result = cp.recompute_base()
        # US has 0% VAT → base == sticker
        assert result == 1999
        assert cp.base_minor == 1999

    def test_recompute_base_untracked_country_returns_sticker(self):
        plan = Plan.objects.create(
            name="Basic XX", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd_xx", amount=1000)
        cp = CountryPrice(
            plan_price=pp,
            country="ZZ",  # untracked → rate = 0
            currency="usd",
            sticker_minor=1000,
            base_minor=0,
        )
        result = cp.recompute_base()
        assert result == 1000


# ── country resolution ──────────────────────────────────────────────────────


class TestCountryResolution:
    def test_country_from_locale(self):
        assert _country_from_locale("es-ES") == "ES"
        assert _country_from_locale("en-GB,en;q=0.9") == "GB"
        assert _country_from_locale("fr") == "FR"  # language default
        assert _country_from_locale("en") is None  # region-ambiguous
        assert _country_from_locale(None) is None

    def test_country_from_locale_underscore_separator(self):
        # Some browsers/servers emit locale with underscore (es_ES, zh_CN)
        assert _country_from_locale("es_ES") == "ES"
        assert _country_from_locale("zh_CN") == "CN"

    def test_country_from_locale_zh_maps_to_cn_via_language_default(self):
        # "zh" without a region subtag → maps to CN via _LANG_DEFAULT_COUNTRY
        assert _country_from_locale("zh") == "CN"

    def test_country_from_locale_da_maps_to_dk(self):
        assert _country_from_locale("da") == "DK"
        assert _country_from_locale("sv") == "SE"

    def test_country_from_locale_region_only_two_alpha_extracted(self):
        # Quality-weighted list: second entry (en-GB) with explicit region
        assert _country_from_locale("en-US") == "US"

    def test_override_wins(self):
        req = APIRequestFactory().get("/?country=de")
        assert _resolve_pricing_country(Request(req), None) == "DE"

    def test_override_uppercased(self):
        # Lowercase override must be normalised to uppercase
        req = APIRequestFactory().get("/?country=fr")
        assert _resolve_pricing_country(Request(req), None) == "FR"

    def test_invalid_country_override_raises_validation_error(self):
        req = APIRequestFactory().get("/?country=INVALID")
        with pytest.raises(ValidationError) as exc_info:
            _resolve_pricing_country(Request(req), None)
        assert "country" in str(exc_info.value.detail)

    def test_invalid_country_override_with_digits_raises_validation_error(self):
        req = APIRequestFactory().get("/?country=E1")
        with pytest.raises(ValidationError):
            _resolve_pricing_country(Request(req), None)

    def test_falls_back_to_locale_then_none(self):
        user = User.objects.create_user(email="fr@example.com", full_name="FR")
        user.preferred_locale = "fr-FR"
        req = Request(APIRequestFactory().get("/"))
        assert _resolve_pricing_country(req, user) == "FR"

        anon_req = Request(APIRequestFactory().get("/"))
        assert _resolve_pricing_country(anon_req, None) is None

    def test_user_preferred_locale_wins_over_accept_language(self):
        user = User.objects.create_user(email="de@example.com", full_name="DE User")
        user.preferred_locale = "de-DE"
        # Accept-Language says ES, but user preference says DE
        factory = APIRequestFactory()
        raw_req = factory.get("/", HTTP_ACCEPT_LANGUAGE="es-ES")
        req = Request(raw_req)
        assert _resolve_pricing_country(req, user) == "DE"

    def test_cf_ipcountry_header_used_as_last_resort(self):
        factory = APIRequestFactory()
        raw_req = factory.get("/", HTTP_CF_IPCOUNTRY="JP")
        req = Request(raw_req)
        result = _resolve_pricing_country(req, None)
        assert result == "JP"

    def test_cf_ipcountry_xx_sentinel_ignored(self):
        factory = APIRequestFactory()
        raw_req = factory.get("/", HTTP_CF_IPCOUNTRY="XX")
        req = Request(raw_req)
        result = _resolve_pricing_country(req, None)
        assert result is None

    def test_accept_language_used_when_user_has_no_locale(self):
        user = User.objects.create_user(email="nolocale@example.com", full_name="No Locale")
        user.preferred_locale = None
        factory = APIRequestFactory()
        raw_req = factory.get("/", HTTP_ACCEPT_LANGUAGE="it-IT")
        req = Request(raw_req)
        assert _resolve_pricing_country(req, user) == "IT"


# ── sync_localized_prices: country price edge cases ─────────────────────────


class TestCountrySuggestionRefreshEdgeCases:
    def _fx(self):
        return fx_response({"eur": 0.90})

    def test_uncurated_row_with_usd_currency_uses_direct_amount(self):
        """A US country price (currency=usd) should get sticker=amount unchanged."""
        plan = Plan.objects.create(
            name="Basic", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_us", amount=1999)
        cp = CountryPrice.objects.create(
            plan_price=pp,
            country="US",
            currency="usd",
            sticker_minor=1999,
            base_minor=1999,
            is_curated=False,
        )

        from apps.billing.tasks import sync_localized_prices

        with patch("apps.billing.tasks.httpx.get", return_value=self._fx()):
            sync_localized_prices()

        cp.refresh_from_db()
        # USD country price: sticker == USD amount, base == sticker (zero rate)
        assert cp.sticker_minor == 1999
        assert cp.base_minor == 1999

    def test_uncurated_row_skipped_when_no_fx_rate_for_currency(self):
        """When the FX feed has no rate for the country's currency, the row is untouched."""
        plan = Plan.objects.create(
            name="BasicSK", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_sk", amount=2000)
        # HUF is not in our mock FX response → _suggested_sticker returns None
        cp = CountryPrice.objects.create(
            plan_price=pp,
            country="HU",
            currency="huf",  # not in mock rates
            sticker_minor=5000,
            base_minor=3937,
            is_curated=False,
        )

        from apps.billing.tasks import sync_localized_prices

        # Only EUR rate returned — no HUF
        with patch("apps.billing.tasks.httpx.get", return_value=self._fx()):
            sync_localized_prices()

        cp.refresh_from_db()
        # Untouched because no FX rate for HUF
        assert cp.sticker_minor == 5000
        assert cp.base_minor == 3937

    def test_uncurated_row_not_updated_when_sticker_already_matches(self):
        """When the FX suggestion matches the existing sticker, the row is left unchanged."""
        plan = Plan.objects.create(
            name="BasicFR", context="personal", tier=2, interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_fr", amount=2000)
        # 2000 cents USD * 0.90 = 18.00 EUR → friendly-rounded → sticker should be 1799
        # Pre-seed it to the expected value so no update is needed
        expected_sticker = 1799  # round_friendly(18.00, "eur") → 17.99 → 1799 minor
        cp = CountryPrice.objects.create(
            plan_price=pp,
            country="FR",
            currency="eur",
            sticker_minor=expected_sticker,
            base_minor=round(expected_sticker / 1.20),
            is_curated=False,
        )
        original_updated_at = cp.updated_at

        from apps.billing.tasks import sync_localized_prices

        with patch("apps.billing.tasks.httpx.get", return_value=self._fx()):
            sync_localized_prices()

        cp.refresh_from_db()
        # Sticker matches, no bulk_update fired for this row — updated_at unchanged
        assert cp.sticker_minor == expected_sticker
        assert cp.updated_at == original_updated_at


# ── per-country exclusive Price for product prices ───────────────────────────


class TestSyncCountryStripePricesProduct:
    @pytest.fixture(autouse=True)
    def _usd_only(self, settings):
        settings.BILLING_CURRENCIES = ["usd"]

    def test_mints_exclusive_per_country_price_for_product(self):
        product = Product.objects.create(
            name="100 Credits", type="one_time", credits=100, is_active=True
        )
        pp = ProductPrice.objects.create(
            product=product, stripe_price_id="price_prod_usd", amount=999
        )
        cp = CountryPrice.objects.create(
            product_price=pp,
            country="GB",
            currency="gbp",
            sticker_minor=799,
            base_minor=666,
            is_curated=True,
        )

        created_prices = iter(
            [SimpleNamespace(id="price_prod_usd_new"), SimpleNamespace(id="price_prod_gb_new")]
        )

        def _price_create(**kwargs):
            return next(created_prices)

        with (
            patch("stripe.Price.list", return_value=MagicMock(data=[])),
            patch("stripe.Product.create", return_value=SimpleNamespace(id="prod_x")),
            patch("stripe.Price.create", side_effect=_price_create) as mock_create,
            patch("stripe.Product.modify"),
            patch("stripe.Price.modify"),
        ):
            call_command("sync_stripe_catalog", stdout=StringIO(), stderr=StringIO())

        # The per-country create for the product must carry the exclusive base + currency
        country_call = next(c for c in mock_create.call_args_list if c.kwargs["currency"] == "gbp")
        assert country_call.kwargs["unit_amount"] == 666
        assert country_call.kwargs["tax_behavior"] == "exclusive"
        assert country_call.kwargs["lookup_key"] == "product_100_credits_c_gb"
        assert country_call.kwargs["metadata"]["country"] == "GB"
        # No recurring for one-time products
        assert "recurring" not in country_call.kwargs

        cp.refresh_from_db()
        assert cp.stripe_price_id == "price_prod_gb_new"


# ── un-minted country price falls back to USD anchor ────────────────────────


class TestUnmintedCountryPriceFallback:
    def _plan_with_unminted_country_price(self) -> PlanPrice:
        plan = Plan.objects.create(
            name="Unminted Plan", context="personal", interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd_anchor", amount=1999)
        # A CountryPrice row exists but has no stripe_price_id yet
        CountryPrice.objects.create(
            plan_price=pp,
            country="IT",
            currency="eur",
            sticker_minor=1999,
            base_minor=1638,
            stripe_price_id=None,  # not yet minted
            is_curated=False,
        )
        return pp

    def test_catalog_with_unminted_country_price_falls_back_to_usd(self, authed_client):
        """A CountryPrice with no stripe_price_id is treated as absent → USD anchor."""
        self._plan_with_unminted_country_price()
        resp = authed_client.get("/api/v1/billing/plans/?country=IT")
        assert resp.status_code == 200
        price = resp.data["results"][0]["price"]
        # Falls back to the USD anchor, not the unminted per-country sticker
        assert price["currency"] == "usd"
        assert price["tax_inclusive"] is False


# ── catalog API: tax-inclusive sticker vs USD fallback ──────────────────────


class TestCatalogCountryDisplay:
    def _plan_with_country_price(self) -> tuple[PlanPrice, CountryPrice]:
        plan = Plan.objects.create(
            name="Personal Monthly", context="personal", interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd", amount=1999)
        cp = CountryPrice.objects.create(
            plan_price=pp,
            country="ES",
            currency="eur",
            sticker_minor=1999,
            base_minor=1652,
            stripe_price_id="price_es",
            is_curated=True,
        )
        return pp, cp

    def test_country_shows_inclusive_sticker(self, authed_client):
        self._plan_with_country_price()
        resp = authed_client.get("/api/v1/billing/plans/?country=ES")
        assert resp.status_code == 200
        price = resp.data["results"][0]["price"]
        assert price["display_amount"] == 19.99
        assert price["currency"] == "eur"
        assert price["tax_inclusive"] is True

    def test_no_country_falls_back_to_usd(self, authed_client):
        self._plan_with_country_price()
        # 'en' is region-ambiguous and there is no ES locale/IP → USD anchor.
        resp = authed_client.get("/api/v1/billing/plans/")
        assert resp.status_code == 200
        price = resp.data["results"][0]["price"]
        assert price["currency"] == "usd"
        assert price["tax_inclusive"] is False

    def test_unknown_country_falls_back_to_usd(self, authed_client):
        self._plan_with_country_price()
        resp = authed_client.get("/api/v1/billing/plans/?country=JP")
        assert resp.status_code == 200
        price = resp.data["results"][0]["price"]
        assert price["currency"] == "usd"
        assert price["tax_inclusive"] is False

    def test_invalid_country_code_returns_400(self, authed_client):
        """A country override that is not 2 alpha chars must be rejected with 400."""
        self._plan_with_country_price()
        resp = authed_client.get("/api/v1/billing/plans/?country=INVALID")
        assert resp.status_code == 400

    def test_products_endpoint_shows_inclusive_sticker_for_country(self, authed_client):
        """Products endpoint also respects ?country= and shows tax-inclusive sticker."""
        product = Product.objects.create(
            name="100 Credits", type="one_time", credits=100, is_active=True
        )
        pp = ProductPrice.objects.create(
            product=product, stripe_price_id="price_prod_usd", amount=999
        )
        CountryPrice.objects.create(
            product_price=pp,
            country="DE",
            currency="eur",
            sticker_minor=899,
            base_minor=755,
            stripe_price_id="price_prod_de",
            is_curated=True,
        )
        resp = authed_client.get("/api/v1/billing/products/?country=DE")
        assert resp.status_code == 200
        price = resp.data["results"][0]["price"]
        assert price["currency"] == "eur"
        assert price["tax_inclusive"] is True


# ── checkout: per-country Stripe Price selection ────────────────────────────


class TestCheckoutCountrySelection:
    @patch("apps.billing.views.create_checkout_session", new_callable=AsyncMock)
    @patch("apps.billing.views.get_or_create_customer", new_callable=AsyncMock)
    def test_checkout_uses_per_country_price(self, mock_get_customer, mock_create, authed_client):
        from uuid import uuid4

        from saasmint_core.domain.stripe_customer import StripeCustomer as DomainCustomer

        mock_get_customer.return_value = DomainCustomer(
            id=uuid4(),
            stripe_id="cus_x",
            user_id=uuid4(),
            org_id=None,
            livemode=False,
            created_at=datetime.now(UTC),
        )
        mock_create.return_value = "https://checkout.stripe.com/s"

        plan = Plan.objects.create(
            name="Personal Monthly", context="personal", interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd", amount=1999)
        CountryPrice.objects.create(
            plan_price=pp,
            country="ES",
            currency="eur",
            sticker_minor=1999,
            base_minor=1652,
            stripe_price_id="price_es",
            is_curated=True,
        )

        resp = authed_client.post(
            "/api/v1/billing/checkout-sessions/?country=ES",
            {
                "plan_price_id": str(pp.id),
                "success_url": "https://localhost/success",
                "cancel_url": "https://localhost/cancel",
            },
            format="json",
        )
        assert resp.status_code == 201
        # The per-country Stripe Price (and its currency) drive the session.
        assert mock_create.call_args.kwargs["price_id"] == "price_es"
        assert mock_create.call_args.kwargs["billing_currency"] == "eur"

    @patch("apps.billing.views.create_checkout_session", new_callable=AsyncMock)
    @patch("apps.billing.views.get_or_create_customer", new_callable=AsyncMock)
    def test_checkout_without_country_uses_usd_anchor(
        self, mock_get_customer, mock_create, authed_client
    ):
        from uuid import uuid4

        from saasmint_core.domain.stripe_customer import StripeCustomer as DomainCustomer

        mock_get_customer.return_value = DomainCustomer(
            id=uuid4(),
            stripe_id="cus_x",
            user_id=uuid4(),
            org_id=None,
            livemode=False,
            created_at=datetime.now(UTC),
        )
        mock_create.return_value = "https://checkout.stripe.com/s"

        plan = Plan.objects.create(
            name="Personal Monthly", context="personal", interval="month", is_active=True
        )
        pp = PlanPrice.objects.create(plan=plan, stripe_price_id="price_usd", amount=1999)
        CountryPrice.objects.create(
            plan_price=pp,
            country="ES",
            currency="eur",
            sticker_minor=1999,
            base_minor=1652,
            stripe_price_id="price_es",
            is_curated=True,
        )

        resp = authed_client.post(
            "/api/v1/billing/checkout-sessions/",
            {
                "plan_price_id": str(pp.id),
                "success_url": "https://localhost/success",
                "cancel_url": "https://localhost/cancel",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert mock_create.call_args.kwargs["price_id"] == "price_usd"
        assert mock_create.call_args.kwargs["billing_currency"] == "usd"
