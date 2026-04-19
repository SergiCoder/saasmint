"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CancelSubscription } from "@/application/use-cases/billing/CancelSubscription";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { OpenBillingPortal } from "@/application/use-cases/billing/OpenBillingPortal";
import { ResumeSubscription } from "@/application/use-cases/billing/ResumeSubscription";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { UpdateSeats } from "@/application/use-cases/billing/UpdateSeats";
import { BillingError } from "@/domain/errors/BillingError";
import { MAX_SEATS } from "@/domain/models/Subscription";
import { authGateway, subscriptionGateway } from "@/infrastructure/registry";
import { canManageBilling } from "@/app/[locale]/(app)/subscription/_data/canManageBilling";
import {
  APP_ORIGIN,
  assertTrustedRedirect,
} from "@/app/[locale]/(app)/subscription/_data/trustedRedirect";

export async function startCheckout(
  _prevState: unknown,
  formData: FormData,
): Promise<BillingActionResult> {
  const planPriceId = formData.get("planPriceId");
  const quantityRaw = formData.get("quantity");

  if (typeof planPriceId !== "string") {
    return { ok: false, error: "Invalid input" };
  }

  let quantity: number | undefined;
  if (typeof quantityRaw === "string" && quantityRaw) {
    const parsed = parseInt(quantityRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      quantity = Math.min(parsed, MAX_SEATS);
    }
  }

  const orgName = formData.get("orgName");

  let url: string;
  try {
    const session = await new StartCheckout(subscriptionGateway).execute({
      planPriceId,
      ...(quantity ? { quantity } : {}),
      ...(typeof orgName === "string" && orgName ? { orgName } : {}),
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to start checkout", err);
    return { ok: false, error: "Failed to start checkout" };
  }

  redirect(url);
}

export async function openBillingPortal() {
  let url: string | null = null;
  try {
    await assertCanManageBilling();
    const session = await new OpenBillingPortal(subscriptionGateway).execute({
      returnUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to open billing portal", err);
  }

  if (!url) return;
  redirect(url);
}

/**
 * Ensures the current user is allowed to manage billing on the active
 * subscription. Throws a BillingError otherwise. Used as defense-in-depth
 * for the cancel/resume server actions — the UI already hides the buttons
 * for non-billing members, and the Django API also enforces the rule.
 */
async function assertCanManageBilling(): Promise<void> {
  const [user, subscription] = await Promise.all([
    new GetCurrentUser(authGateway).execute(),
    new GetSubscription(subscriptionGateway).execute(),
  ]);
  if (!subscription) {
    throw new BillingError("No active subscription", "no_subscription");
  }
  const allowed = await canManageBilling(user, subscription);
  if (!allowed) {
    throw new BillingError(
      "You do not have permission to manage billing",
      "not_billing_member",
    );
  }
}

export type BillingActionResult = { ok: true } | { ok: false; error: string };

function toErrorMessage(err: unknown): string {
  if (err instanceof BillingError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export async function cancelSubscription(): Promise<BillingActionResult> {
  try {
    await assertCanManageBilling();
    await new CancelSubscription(subscriptionGateway).execute();
  } catch (err) {
    console.error("Failed to cancel subscription", err);
    return { ok: false, error: toErrorMessage(err) };
  }
  revalidatePath("/subscription", "layout");
  return { ok: true };
}

export async function resumeSubscription(): Promise<BillingActionResult> {
  try {
    await assertCanManageBilling();
    await new ResumeSubscription(subscriptionGateway).execute();
  } catch (err) {
    console.error("Failed to resume subscription", err);
    return { ok: false, error: toErrorMessage(err) };
  }
  revalidatePath("/subscription", "layout");
  return { ok: true };
}

export async function updateSeats(
  _prevState: unknown,
  formData: FormData,
): Promise<BillingActionResult> {
  const quantityRaw = formData.get("quantity");

  if (typeof quantityRaw !== "string") {
    return { ok: false, error: "Invalid input" };
  }

  const quantity = parseInt(quantityRaw, 10);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_SEATS) {
    return { ok: false, error: "Invalid seat count" };
  }

  try {
    await assertCanManageBilling();
    await new UpdateSeats(subscriptionGateway).execute(quantity);
  } catch (err) {
    console.error("Failed to update seats", err);
    return { ok: false, error: toErrorMessage(err) };
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}
