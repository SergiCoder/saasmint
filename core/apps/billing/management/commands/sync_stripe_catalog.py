"""Sync local Plans/Products and their prices to Stripe, per billing currency.

For every active Plan/Product and every currency in ``settings.BILLING_CURRENCIES``,
creates Stripe Products + Prices to mirror the local catalog and writes the
resulting Stripe price IDs back onto the right local row:

- **USD**: stamped on ``PlanPrice.stripe_price_id`` / ``ProductPrice.stripe_price_id``
  (preserves the historical single-currency code path; lookup_key unchanged).
- **Non-USD billable**: stamped on ``LocalizedPrice.stripe_price_id``; lookup_key
  is suffixed with ``_{currency}`` (e.g. ``plan_personal_basic_month_eur``).

Idempotent: existing prices are matched by ``lookup_key``; if amount/currency
drift, the old price is archived and a new one is created under the same
Stripe Product, transferring the lookup key.

Bootstrap: when a non-USD ``LocalizedPrice`` row is missing for a billing
currency, this command runs ``sync_localized_prices`` inline so the ``unit_amount``
sent to Stripe is FX-correct on first deploy. If FX is unreachable the row stays
absent and the currency is skipped with a warning — the next deploy retries.
"""

from __future__ import annotations

import re
from typing import Any, Literal

import stripe
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.billing.models import (
    CountryPrice,
    LocalizedPrice,
    Plan,
    PlanPrice,
    PlanTier,
    Product,
    ProductPrice,
)
from apps.billing.vat import derive_base, standard_vat_rate

# Tax behavior set explicitly on every Price so it is version-controlled and
# independent of the Stripe dashboard account default. Existing prices are
# ``unspecified`` — the allowed one-time transition to ``exclusive`` (design D2).
_TAX_BEHAVIOR: Literal["exclusive"] = "exclusive"


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def _plan_lookup_key(plan: Plan, currency: str) -> str:
    tier_name = PlanTier(plan.tier).name.lower()
    base = f"plan_{plan.context}_{tier_name}_{plan.interval}"
    return base if currency == "usd" else f"{base}_{currency}"


def _product_lookup_key(product: Product, currency: str) -> str:
    base = f"product_{_slug(product.name)}"
    return base if currency == "usd" else f"{base}_{currency}"


def _country_lookup_key(base_lookup_key: str, country: str) -> str:
    """Per-country lookup key derived from the USD base key.

    Suffixed with ``_c_{country}`` so it never collides with a per-*currency*
    key (``_{currency}``) for the same plan/product — France's ``_c_fr`` row and
    a generic ``_eur`` row are distinct Stripe Prices.
    """
    return f"{base_lookup_key}_c_{country.lower()}"


class Command(BaseCommand):
    help = "Create or update Stripe Products and Prices to match the local catalog."

    def handle(self, *args: object, **options: object) -> None:
        if not stripe.api_key:
            self.stderr.write(self.style.ERROR("STRIPE_SECRET_KEY is not configured."))
            return

        currencies: list[str] = list(settings.BILLING_CURRENCIES)

        # Hoist a one-time bulk fetch of every lookup_key we might need so
        # ``_upsert_price`` can do a dict lookup instead of an O(N*C)
        # per-(plan, currency) ``Price.list`` call. Stripe accepts up to 10
        # ``lookup_keys`` per ``Price.list`` request — batch accordingly.
        wanted_keys = self._collect_lookup_keys(currencies)
        existing_prices = self._bulk_fetch_existing(wanted_keys)

        for currency in currencies:
            self.stdout.write(f"— {currency.upper()} —")
            self._sync_plans(currency, existing_prices)
            self._sync_products(currency, existing_prices)

        # Per-country prices are an independent dimension (tax region, not
        # currency): one exclusive-base Stripe Price per CountryPrice row.
        self.stdout.write("— PER-COUNTRY —")
        self._sync_country_prices(existing_prices)
        self.stdout.write(self.style.SUCCESS("Stripe catalog sync complete."))

    def _collect_lookup_keys(self, currencies: list[str]) -> list[str]:
        """Enumerate every Stripe ``lookup_key`` this run could touch.

        One per (active plan or product, billing currency). Computed up front
        so the bulk fetch can deduplicate and batch by 10 (Stripe's per-call
        ``lookup_keys`` limit).
        """
        keys: list[str] = []
        for plan in Plan.objects.filter(is_active=True):
            for currency in currencies:
                keys.append(_plan_lookup_key(plan, currency))
        for product in Product.objects.filter(is_active=True):
            for currency in currencies:
                keys.append(_product_lookup_key(product, currency))
        # Per-country keys, derived from each owner's USD base key.
        for cp in CountryPrice.objects.select_related("plan_price__plan", "product_price__product"):
            keys.append(_country_lookup_key(self._owner_base_lookup_key(cp), cp.country))
        return keys

    @staticmethod
    def _bulk_fetch_existing(lookup_keys: list[str]) -> dict[str, stripe.Price]:
        """Resolve ``{lookup_key: stripe.Price}`` in batches of 10.

        Stripe's ``Price.list`` accepts at most 10 ``lookup_keys`` per call.
        Missing keys are simply absent from the returned dict — callers
        treat that as "no existing price" and create one.
        """
        result: dict[str, stripe.Price] = {}
        for i in range(0, len(lookup_keys), 10):
            batch = lookup_keys[i : i + 10]
            page = stripe.Price.list(lookup_keys=batch, limit=10, expand=["data.product"])
            for price in page.data:
                if price.lookup_key:
                    result[price.lookup_key] = price
        return result

    # ------------------------------------------------------------------ plans

    def _sync_plans(self, currency: str, existing_prices: dict[str, stripe.Price]) -> None:
        plans = Plan.objects.filter(is_active=True).select_related("price")
        for plan in plans:
            price_row: PlanPrice | None = getattr(plan, "price", None)
            if price_row is None:
                self.stdout.write(f"  · Skipping plan {plan.name}: no PlanPrice row")
                continue

            unit_amount = self._unit_amount_for(price_row, currency, owner_kwarg="plan_price_id")
            if unit_amount is None:
                # Bootstrap couldn't produce a localized amount (FX feed down on
                # first deploy). Skip this currency this run; next deploy retries.
                continue

            new_price_id = self._upsert_price(
                lookup_key=_plan_lookup_key(plan, currency),
                unit_amount=unit_amount,
                currency=currency,
                recurring={"interval": plan.interval},
                product_name=plan.name,
                product_description=plan.description or None,
                product_metadata={"local_plan_id": str(plan.id), "kind": "plan"},
                price_metadata={"local_plan_id": str(plan.id)},
                existing_prices=existing_prices,
            )
            self._write_price_id(
                price_row, new_price_id, currency=currency, label=f"Plan {plan.name}"
            )

    # --------------------------------------------------------------- products

    def _sync_products(self, currency: str, existing_prices: dict[str, stripe.Price]) -> None:
        products = Product.objects.filter(is_active=True).select_related("price")
        for product in products:
            price_row: ProductPrice | None = getattr(product, "price", None)
            if price_row is None:
                self.stdout.write(f"  · Skipping product {product.name}: no ProductPrice row")
                continue

            unit_amount = self._unit_amount_for(price_row, currency, owner_kwarg="product_price_id")
            if unit_amount is None:
                continue

            new_price_id = self._upsert_price(
                lookup_key=_product_lookup_key(product, currency),
                unit_amount=unit_amount,
                currency=currency,
                recurring=None,
                product_name=product.name,
                product_description=f"{product.credits} credits",
                product_metadata={"local_product_id": str(product.id), "kind": "product"},
                price_metadata={"local_product_id": str(product.id)},
                existing_prices=existing_prices,
            )
            self._write_price_id(
                price_row, new_price_id, currency=currency, label=f"Product {product.name}"
            )

    # ----------------------------------------------------------- per-country

    @staticmethod
    def _owner_base_lookup_key(cp: CountryPrice) -> str:
        """USD base lookup key of the plan/product that owns *cp* (pre-suffix)."""
        if cp.plan_price_id is not None:
            return _plan_lookup_key(cp.plan_price.plan, "usd")  # type: ignore[union-attr]  # XOR: plan_price set when plan_price_id is not None
        return _product_lookup_key(cp.product_price.product, "usd")  # type: ignore[union-attr]  # XOR: product_price set otherwise

    def _sync_country_prices(self, existing_prices: dict[str, stripe.Price]) -> None:
        """Mint one exclusive-base Stripe Price per ``CountryPrice`` row.

        ``unit_amount`` is the tax-exclusive base re-derived from the (curated or
        FX-suggested) inclusive sticker and the country's standard VAT rate, so
        the Stripe Price always reflects the current sticker even if the
        seed/localize steps lagged. The recomputed base is persisted back onto
        the row. Idempotent via the per-country lookup key.
        """
        rows = CountryPrice.objects.select_related(
            "plan_price__plan", "product_price__product"
        ).order_by("country")
        for cp in rows:
            is_plan = cp.plan_price_id is not None
            if is_plan:
                owner_plan = cp.plan_price.plan  # type: ignore[union-attr]  # XOR: plan_price set when is_plan
                product_name = owner_plan.name
                product_description = owner_plan.description or None
                product_metadata = {"local_plan_id": str(owner_plan.id), "kind": "plan"}
                price_metadata = {
                    "local_plan_id": str(owner_plan.id),
                    "country": cp.country,
                }
                recurring: dict[str, Any] | None = {"interval": owner_plan.interval}
            else:
                owner_product = cp.product_price.product  # type: ignore[union-attr]  # XOR: product_price set otherwise
                product_name = owner_product.name
                product_description = f"{owner_product.credits} credits"
                product_metadata = {"local_product_id": str(owner_product.id), "kind": "product"}
                price_metadata = {
                    "local_product_id": str(owner_product.id),
                    "country": cp.country,
                }
                recurring = None

            base = derive_base(cp.sticker_minor, standard_vat_rate(cp.country))
            if cp.base_minor != base:
                cp.base_minor = base
                cp.save(update_fields=["base_minor"])

            lookup_key = _country_lookup_key(self._owner_base_lookup_key(cp), cp.country)
            new_price_id = self._upsert_price(
                lookup_key=lookup_key,
                unit_amount=base,
                currency=cp.currency,
                recurring=recurring,
                product_name=product_name,
                product_description=product_description,
                product_metadata=product_metadata,
                price_metadata=price_metadata,
                existing_prices=existing_prices,
            )
            label = f"{product_name} [{cp.country}/{cp.currency.upper()}]"
            if cp.stripe_price_id == new_price_id:
                self.stdout.write(f"  = {label}: already in sync ({new_price_id})")
                continue
            old = cp.stripe_price_id
            cp.stripe_price_id = new_price_id
            cp.save(update_fields=["stripe_price_id"])
            self.stdout.write(f"  ✓ {label}: {old} → {new_price_id}")

    # ---------------------------------------------------------------- helpers

    def _unit_amount_for(
        self,
        price_row: PlanPrice | ProductPrice,
        currency: str,
        *,
        owner_kwarg: str,
    ) -> int | None:
        """Resolve the Stripe Price ``unit_amount`` for *price_row* in *currency*.

        USD reads ``price_row.amount`` directly (source-of-truth USD cents).
        Non-USD reads the matching ``LocalizedPrice.amount_minor``. If the
        localized row is missing this is the bootstrap case — run
        ``sync_localized_prices`` inline once and retry; if FX is still
        unreachable, return ``None`` so the caller skips this currency.
        """
        if currency == "usd":
            return price_row.amount

        owner_filter = {owner_kwarg: price_row.id, "currency": currency}
        existing = LocalizedPrice.objects.filter(**owner_filter).only("amount_minor").first()
        if existing is not None:
            return existing.amount_minor

        # Bootstrap: try to populate the row via the FX feed, then re-query.
        from apps.billing.tasks import sync_localized_prices

        sync_localized_prices()
        existing = LocalizedPrice.objects.filter(**owner_filter).only("amount_minor").first()
        if existing is None:
            self.stdout.write(
                f"  · Skipping {currency.upper()}: no LocalizedPrice row "
                f"(FX feed unreachable on bootstrap)"
            )
            return None
        return existing.amount_minor

    def _upsert_price(
        self,
        *,
        lookup_key: str,
        unit_amount: int,
        currency: str,
        recurring: dict[str, Any] | None,
        product_name: str,
        product_description: str | None,
        product_metadata: dict[str, str],
        price_metadata: dict[str, str],
        existing_prices: dict[str, stripe.Price],
    ) -> str:
        # Pre-fetched bulk lookup table: ``handle()`` calls ``Price.list``
        # once in batches of 10 lookup_keys instead of per-(plan, currency).
        current = existing_prices.get(lookup_key)
        product_id: str | None = None

        if current is not None:
            current_product = current.product
            if self._price_matches(current, unit_amount, currency, recurring):
                self._sync_stripe_product(
                    current_product, product_name, product_description, product_metadata
                )
                # tax_behavior is deliberately NOT part of _price_matches — a
                # drift there must not force archive+recreate. Instead apply the
                # allowed in-place unspecified→exclusive transition here (D2).
                self._ensure_tax_behavior(current)
                return current.id

            # Reuse the existing Stripe Product but archive the stale Price.
            product_id = (
                current_product.id
                if isinstance(current_product, stripe.Product)
                else str(current_product)
            )
            stripe.Price.modify(current.id, active=False)
            self._sync_stripe_product(
                product_id, product_name, product_description, product_metadata
            )

        if product_id is None:
            create_product_kwargs: dict[str, Any] = {
                "name": product_name,
                "metadata": product_metadata,
            }
            if product_description:
                create_product_kwargs["description"] = product_description
            stripe_product = stripe.Product.create(**create_product_kwargs)
            product_id = stripe_product.id

        create_price_kwargs: dict[str, Any] = {
            "product": product_id,
            "unit_amount": unit_amount,
            "currency": currency,
            "lookup_key": lookup_key,
            "transfer_lookup_key": True,
            "tax_behavior": _TAX_BEHAVIOR,
            "metadata": price_metadata,
        }
        if recurring is not None:
            create_price_kwargs["recurring"] = recurring
        new_price = stripe.Price.create(**create_price_kwargs)
        return new_price.id

    def _ensure_tax_behavior(self, price: stripe.Price) -> None:
        """Apply the allowed in-place ``unspecified → exclusive`` transition.

        Stripe freezes ``tax_behavior`` once it is ``inclusive``/``exclusive``,
        so the modify is only valid while the price is still ``unspecified``
        (the migration path for the existing catalog). Already-``exclusive``
        prices are a no-op; an unexpected ``inclusive`` price is left untouched
        and surfaced rather than crashing the sync.
        """
        current_tb = getattr(price, "tax_behavior", None)
        if current_tb == _TAX_BEHAVIOR:
            return
        if current_tb not in (None, "unspecified"):
            self.stdout.write(
                f"  ! {price.id}: tax_behavior is {current_tb!r}; cannot change to "
                f"{_TAX_BEHAVIOR!r} (Stripe freezes it once set)"
            )
            return
        stripe.Price.modify(price.id, tax_behavior=_TAX_BEHAVIOR)
        self.stdout.write(f"  ✓ {price.id}: tax_behavior {current_tb!r} → {_TAX_BEHAVIOR!r}")

    @staticmethod
    def _price_matches(
        stripe_price: stripe.Price,
        unit_amount: int,
        currency: str,
        recurring: dict[str, Any] | None,
    ) -> bool:
        if stripe_price.unit_amount != unit_amount or stripe_price.currency != currency:
            return False
        current_recurring = stripe_price.recurring
        if recurring is None:
            return current_recurring is None
        if current_recurring is None:
            return False
        return bool(current_recurring.interval == recurring["interval"])

    def _sync_stripe_product(
        self,
        product_or_id: stripe.Product | str,
        name: str,
        description: str | None,
        metadata: dict[str, str],
    ) -> None:
        existing_metadata: dict[str, str] = {}
        if isinstance(product_or_id, stripe.Product):
            product_id = product_or_id.id
            existing_name: str | None = product_or_id.name
            existing_description: str | None = product_or_id.description
            raw_metadata = product_or_id.metadata
            if raw_metadata:
                # ``UntypedStripeObject`` exposes attributes/keys via ``to_dict()``.
                existing_metadata = {str(k): str(v) for k, v in raw_metadata.to_dict().items()}
        else:
            product_id = product_or_id
            existing_name = None
            existing_description = None

        update: dict[str, Any] = {}
        if existing_name is not None and existing_name != name:
            update["name"] = name
        if description and existing_description != description:
            update["description"] = description
        merged_metadata = {**existing_metadata, **metadata}
        if merged_metadata != existing_metadata:
            update["metadata"] = merged_metadata
        if update:
            stripe.Product.modify(product_id, **update)

    def _write_price_id(
        self,
        price_row: PlanPrice | ProductPrice,
        new_price_id: str,
        *,
        currency: str,
        label: str,
    ) -> None:
        """Stamp *new_price_id* onto the right column.

        USD lives on ``price_row.stripe_price_id`` (existing column). Non-USD
        lives on ``LocalizedPrice.stripe_price_id`` for the matching
        (price_row, currency) pair.
        """
        full_label = f"{label} [{currency.upper()}]"
        if currency == "usd":
            current_id = price_row.stripe_price_id
            if new_price_id == current_id:
                self.stdout.write(f"  = {full_label}: already in sync ({new_price_id})")
                return
            price_row.stripe_price_id = new_price_id
            price_row.save(update_fields=["stripe_price_id"])
            self.stdout.write(f"  ✓ {full_label}: {current_id} → {new_price_id}")
            return

        owner_kwargs: dict[str, Any] = (
            {"plan_price_id": price_row.id}
            if isinstance(price_row, PlanPrice)
            else {"product_price_id": price_row.id}
        )
        localized = LocalizedPrice.objects.filter(currency=currency, **owner_kwargs).first()
        if localized is None:
            # Should be unreachable: _unit_amount_for already triggered bootstrap.
            self.stdout.write(f"  ! {full_label}: LocalizedPrice row vanished mid-sync; skipping")
            return
        if localized.stripe_price_id == new_price_id:
            self.stdout.write(f"  = {full_label}: already in sync ({new_price_id})")
            return
        old = localized.stripe_price_id
        localized.stripe_price_id = new_price_id
        localized.save(update_fields=["stripe_price_id"])
        self.stdout.write(f"  ✓ {full_label}: {old} → {new_price_id}")
