"""Seed plans, plan prices, and boost products. Idempotent — safe to run on every deploy."""

from __future__ import annotations

from decimal import Decimal
from typing import TypedDict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.billing.models import (
    CountryPrice,
    Plan,
    PlanContext,
    PlanInterval,
    PlanPrice,
    PlanTier,
    Product,
    ProductPrice,
    ProductType,
)
from apps.billing.vat import COUNTRY_CURRENCY, derive_base, standard_vat_rate


class _PlanSpec(TypedDict):
    name: str
    description: str
    context: PlanContext
    tier: PlanTier
    interval: PlanInterval
    amount: int


# Yearly plans are generated from monthly by charging 10x the monthly amount
# (two months free) and appending an annual-billing note to the description.
_YEARLY_DISCOUNT_MONTHS = 10
_YEARLY_DESCRIPTION_SUFFIX = " Billed annually \u2014 two months free."


_MONTHLY_PLANS: list[_PlanSpec] = [
    {
        "name": "Personal Basic",
        "description": (
            "For power users. Advanced analytics, priority email support, and API access."
        ),
        "context": PlanContext.PERSONAL,
        "tier": PlanTier.BASIC,
        "interval": PlanInterval.MONTH,
        "amount": 1999,
    },
    {
        "name": "Personal Pro",
        "description": (
            "Everything in Basic plus custom integrations, audit logs, and dedicated support."
        ),
        "context": PlanContext.PERSONAL,
        "tier": PlanTier.PRO,
        "interval": PlanInterval.MONTH,
        "amount": 4999,
    },
    {
        "name": "Team Basic",
        "description": (
            "For small teams. Per-seat pricing, shared dashboards, and team analytics."
        ),
        "context": PlanContext.TEAM,
        "tier": PlanTier.BASIC,
        "interval": PlanInterval.MONTH,
        "amount": 1799,
    },
    {
        "name": "Team Pro",
        "description": (
            "For growing organizations. Per-seat pricing, SSO, audit logs, and dedicated support."
        ),
        "context": PlanContext.TEAM,
        "tier": PlanTier.PRO,
        "interval": PlanInterval.MONTH,
        "amount": 4599,
    },
]


def _build_plans() -> list[_PlanSpec]:
    """Return monthly plans + a yearly variant for every monthly plan."""
    yearly: list[_PlanSpec] = [
        {
            "name": spec["name"],
            "description": spec["description"] + _YEARLY_DESCRIPTION_SUFFIX,
            "context": spec["context"],
            "tier": spec["tier"],
            "interval": PlanInterval.YEAR,
            "amount": spec["amount"] * _YEARLY_DISCOUNT_MONTHS,
        }
        for spec in _MONTHLY_PLANS
    ]
    return [*_MONTHLY_PLANS, *yearly]


PLANS: list[_PlanSpec] = _build_plans()

# (name, credit_count, amount_usd_cents)
BOOST_PRODUCTS: list[tuple[str, int, int]] = [
    ("50 Credits", 50, 499),
    ("200 Credits", 200, 1499),
    ("500 Credits", 500, 2999),
]


class Command(BaseCommand):
    help = "Seed the plan/product catalog. Idempotent."

    @transaction.atomic
    def handle(self, *args: object, **options: object) -> None:
        self._seed_plans()
        self._seed_products()
        self._seed_country_prices()
        self.stdout.write(self.style.SUCCESS("Catalog seeded."))

    def _seed_plans(self) -> None:
        for spec in PLANS:
            plan, created = Plan.objects.get_or_create(
                context=spec["context"],
                tier=spec["tier"],
                interval=spec["interval"],
                defaults={
                    "name": spec["name"],
                    "description": spec["description"],
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(f"  + Plan: {plan.name}")

            placeholder_price_id = (
                f"price_placeholder_{spec['context']}_{spec['tier']}_{spec['interval']}"
            )
            existing = PlanPrice.objects.filter(plan=plan).first()
            if existing is None:
                PlanPrice.objects.create(
                    plan=plan,
                    amount=spec["amount"],
                    stripe_price_id=placeholder_price_id,
                )
                self.stdout.write(f"  + PlanPrice: {plan.name} = {spec['amount']}c")
            elif existing.amount != spec["amount"]:
                # Amount drift: refresh the amount but preserve any real
                # stripe_price_id minted by ``sync_stripe_catalog`` — only
                # restore the placeholder if no real ID was ever stamped.
                existing.amount = spec["amount"]
                existing.save(update_fields=["amount"])
                self.stdout.write(f"  ✓ PlanPrice: {plan.name} updated to {spec['amount']}c")

    def _seed_products(self) -> None:
        for name, credit_count, amount in BOOST_PRODUCTS:
            product, created = Product.objects.get_or_create(
                name=name,
                defaults={
                    "type": ProductType.ONE_TIME,
                    "credits": credit_count,
                    "is_active": True,
                },
            )
            if created:
                self.stdout.write(f"  + Product: {name}")

            placeholder_price_id = f"price_placeholder_boost_{credit_count}"
            existing = ProductPrice.objects.filter(product=product).first()
            if existing is None:
                ProductPrice.objects.create(
                    product=product,
                    amount=amount,
                    stripe_price_id=placeholder_price_id,
                )
                self.stdout.write(f"  + ProductPrice: {name} = {amount}c")
            elif existing.amount != amount:
                # Amount drift: refresh the amount but preserve any real
                # stripe_price_id minted by ``sync_stripe_catalog``.
                existing.amount = amount
                existing.save(update_fields=["amount"])
                self.stdout.write(f"  ✓ ProductPrice: {name} updated to {amount}c")

    def _seed_country_prices(self) -> None:
        """Seed a per-country inclusive sticker for every (price, launch country).

        The seeded sticker reuses the USD ``amount`` as the local round number
        (the "always 19.99" intent) — a *suggestion* to be curated later, not a
        currency-converted figure. ``sync_localized_prices`` refines the sticker
        from the FX feed for rows that stay un-curated (``is_curated=False``);
        an admin edit pins ``is_curated=True`` and seeding never touches it
        again. Idempotent: existing rows keep their (possibly curated) sticker;
        only the derived ``base_minor`` is re-aligned to the current VAT rate.
        """
        plan_prices = list(PlanPrice.objects.all())
        product_prices = list(ProductPrice.objects.all())
        for country, currency in COUNTRY_CURRENCY.items():
            rate = standard_vat_rate(country)
            for plan_price in plan_prices:
                self._upsert_country_price(
                    country=country,
                    currency=currency,
                    rate=rate,
                    sticker=plan_price.amount,
                    plan_price=plan_price,
                )
            for product_price in product_prices:
                self._upsert_country_price(
                    country=country,
                    currency=currency,
                    rate=rate,
                    sticker=product_price.amount,
                    product_price=product_price,
                )

    def _upsert_country_price(
        self,
        *,
        country: str,
        currency: str,
        rate: Decimal,
        sticker: int,
        plan_price: PlanPrice | None = None,
        product_price: ProductPrice | None = None,
    ) -> None:
        owner: dict[str, PlanPrice | ProductPrice | None] = (
            {"plan_price": plan_price}
            if plan_price is not None
            else {"product_price": product_price}
        )
        existing = CountryPrice.objects.filter(country=country, **owner).first()
        if existing is None:
            CountryPrice.objects.create(
                country=country,
                currency=currency,
                sticker_minor=sticker,
                base_minor=derive_base(sticker, rate),
                is_curated=False,
                **owner,
            )
            return
        # Never overwrite a (possibly curated) sticker; only keep the derived
        # base aligned with the current VAT rate so a rate-table change
        # propagates to the Stripe unit_amount on the next sync.
        new_base = derive_base(existing.sticker_minor, rate)
        if existing.base_minor != new_base:
            existing.base_minor = new_base
            existing.save(update_fields=["base_minor"])
