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
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory

from apps.billing.models import CountryPrice, Plan, PlanPrice
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


# ── country resolution ──────────────────────────────────────────────────────


class TestCountryResolution:
    def test_country_from_locale(self):
        assert _country_from_locale("es-ES") == "ES"
        assert _country_from_locale("en-GB,en;q=0.9") == "GB"
        assert _country_from_locale("fr") == "FR"  # language default
        assert _country_from_locale("en") is None  # region-ambiguous
        assert _country_from_locale(None) is None

    def test_override_wins(self):
        req = APIRequestFactory().get("/?country=de")
        assert _resolve_pricing_country(Request(req), None) == "DE"

    def test_falls_back_to_locale_then_none(self):
        user = User.objects.create_user(email="fr@example.com", full_name="FR")
        user.preferred_locale = "fr-FR"
        req = Request(APIRequestFactory().get("/"))
        assert _resolve_pricing_country(req, user) == "FR"

        anon_req = Request(APIRequestFactory().get("/"))
        assert _resolve_pricing_country(anon_req, None) is None


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
