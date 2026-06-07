"""Seed plans, plan prices, and boost products. Idempotent — safe to run on every deploy."""

from __future__ import annotations

from decimal import Decimal
from typing import TypedDict
from uuid import UUID

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

        Bulk-keyed: every existing row is fetched once into a ``(owner_id,
        country)`` dict, then new rows are ``bulk_create``-d and re-aligned
        bases ``bulk_update``-d in one round-trip each — instead of a
        SELECT-then-write per (price, country) pair, which grows
        multiplicatively as launch markets / plans expand (design D8).
        """
        plan_prices = list(PlanPrice.objects.all())
        product_prices = list(ProductPrice.objects.all())

        # Bucket existing rows by (owner_id, country) so the per-pair decision
        # below is a dict lookup, not a query. plan_price_id / product_price_id
        # are disjoint (XOR), so a single coalesced owner key never collides.
        existing_by_key: dict[tuple[UUID, str], CountryPrice] = {}
        for cp in CountryPrice.objects.all().only(
            "id", "country", "sticker_minor", "base_minor", "plan_price_id", "product_price_id"
        ):
            owner_id = cp.plan_price_id if cp.plan_price_id is not None else cp.product_price_id
            assert owner_id is not None  # noqa: S101  # XOR constraint guarantees one FK is set
            existing_by_key[(owner_id, cp.country)] = cp

        to_create: list[CountryPrice] = []
        to_update: list[CountryPrice] = []
        for country, currency in COUNTRY_CURRENCY.items():
            rate = standard_vat_rate(country)
            owners: list[tuple[PlanPrice | ProductPrice, dict[str, PlanPrice | ProductPrice]]] = [
                (pp, {"plan_price": pp}) for pp in plan_prices
            ]
            owners += [(pp, {"product_price": pp}) for pp in product_prices]
            for price_row, owner_kwarg in owners:
                self._collect_country_row(
                    country=country,
                    currency=currency,
                    rate=rate,
                    sticker=price_row.amount,
                    owner_id=price_row.id,
                    owner_kwarg=owner_kwarg,
                    existing_by_key=existing_by_key,
                    to_create=to_create,
                    to_update=to_update,
                )

        if to_create:
            CountryPrice.objects.bulk_create(to_create)
        if to_update:
            CountryPrice.objects.bulk_update(to_update, ["base_minor"])

    def _collect_country_row(
        self,
        *,
        country: str,
        currency: str,
        rate: Decimal,
        sticker: int,
        owner_id: UUID,
        owner_kwarg: dict[str, PlanPrice | ProductPrice],
        existing_by_key: dict[tuple[UUID, str], CountryPrice],
        to_create: list[CountryPrice],
        to_update: list[CountryPrice],
    ) -> None:
        """Append one (price, country) pair to the create/update batch, or skip.

        New pair → a fresh row on ``to_create``. Existing pair → never touch the
        (possibly curated) sticker; only queue a ``base_minor`` re-alignment when
        the current VAT rate moved it, so a rate-table change still propagates to
        the Stripe ``unit_amount`` on the next sync.
        """
        existing = existing_by_key.get((owner_id, country))
        if existing is None:
            to_create.append(
                CountryPrice(
                    country=country,
                    currency=currency,
                    sticker_minor=sticker,
                    base_minor=derive_base(sticker, rate),
                    is_curated=False,
                    **owner_kwarg,
                )
            )
            return
        old_base = existing.base_minor
        new_base = existing.recompute_base()
        if old_base != new_base:
            to_update.append(existing)
