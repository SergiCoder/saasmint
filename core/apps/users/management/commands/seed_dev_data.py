"""Seed plans, products, and prices for local dev/test."""

from __future__ import annotations

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandParser


class Command(BaseCommand):
    help = "Seed plans, products, and prices for local dev/test. Safe to run multiple times."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--sync-stripe",
            action="store_true",
            help=(
                "After seeding, run the external sync chain: sync_localized_prices "
                "(FX-refine per-country/per-currency prices) then sync_stripe_catalog "
                "(push plans/products to Stripe)."
            ),
        )

    def handle(self, *args: object, **options: object) -> None:
        from django.conf import settings

        if not settings.DEBUG:
            self.stderr.write(self.style.ERROR("seed_dev_data can only run with DEBUG=True"))
            return

        call_command("seed_catalog")

        self.stdout.write(self.style.SUCCESS("Dev data seeded successfully."))

        if options.get("sync_stripe"):
            # Mirror the production entrypoint order:
            #   seed_catalog → sync_localized_prices → sync_stripe_catalog.
            # sync_localized_prices FX-refines the per-country stickers (and the
            # LocalizedPrice rows); without it every per-country sticker stays at
            # the seeded USD placeholder, so the API serves the USD amount merely
            # relabeled in the local currency — plausible for EUR (≈1:1), wildly
            # off for CNY (rate ≈7). It must run *before* sync_stripe_catalog,
            # which mints per-country Stripe Prices from the refined stickers.
            # Both are external (FX feed / Stripe) and gated behind --sync-stripe
            # so a bare seed_dev_data stays offline (used by the unit tests and
            # `make seed`). sync_localized_prices is non-fatal — a missing FX feed
            # logs and returns 0, leaving the placeholders rather than raising.
            self.stdout.write("Running sync_localized_prices...")
            call_command("sync_localized_prices")
            self.stdout.write("Running sync_stripe_catalog...")
            call_command("sync_stripe_catalog")
