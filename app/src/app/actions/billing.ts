"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BillingError } from "@/domain/errors/BillingError";
import { MAX_SEATS, type Subscription } from "@/domain/models/Subscription";
import {
  authGateway,
  productGateway,
  subscriptionGateway,
} from "@/infrastructure/registry";
import { canManageBilling } from "@/app/[locale]/(app)/subscription/_data/canManageBilling";
import {
  APP_ORIGIN,
  assertTrustedRedirect,
} from "@/app/[locale]/(app)/subscription/_data/trustedRedirect";
import {
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import {
  getInt,
  getNonEmptyString,
  getString,
} from "@/lib/actions/parseFormData";

/**
 * Ensures the current user is allowed to manage billing on the active
 * subscription. Throws a BillingError otherwise. Used as defense-in-depth
 * for the cancel/resume server actions — the UI already hides the buttons
 * for non-billing members, and the Django API also enforces the rule.
 */
async function assertCanManageBilling(): Promise<Subscription> {
  const [user, subscription] = await Promise.all([
    authGateway.getCurrentUser(),
    subscriptionGateway.getSubscription(),
  ]);
  if (!subscription) {
    throw new BillingError("No active subscription", "no_subscription");
  }
  if (!(await canManageBilling(user, subscription))) {
    throw new BillingError(
      "You do not have permission to manage billing",
      "not_billing_member",
    );
  }
  return subscription;
}

export async function startProductCheckout(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const productPriceId = getString(formData, "productPriceId");
  if (!productPriceId) return fail("invalid_input");

  let url: string;
  try {
    const session = await productGateway.createCheckoutSession({
      productPriceId,
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to start product checkout", err);
    return toActionError(err);
  }

  redirect(url);
}

export async function startCheckout(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const planPriceId = getString(formData, "planPriceId");
  if (!planPriceId) return fail("invalid_input");

  const rawQuantity = getInt(formData, "quantity");
  const quantity =
    rawQuantity && rawQuantity > 0
      ? Math.min(rawQuantity, MAX_SEATS)
      : undefined;
  const orgName = getNonEmptyString(formData, "orgName");
  const keepPersonalSubscription =
    formData.get("keepPersonalSubscription") === "on";

  let url: string;
  try {
    const session = await subscriptionGateway.createCheckoutSession({
      planPriceId,
      ...(quantity ? { quantity } : {}),
      ...(orgName ? { orgName, keepPersonalSubscription } : {}),
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to start checkout", err);
    return toActionError(err);
  }

  redirect(url);
}

export async function openBillingPortal() {
  let url: string | null = null;
  try {
    await assertCanManageBilling();
    const session = await subscriptionGateway.createBillingPortalSession({
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

/** Schedule the subscription to end at the current period's close. */
export async function cancelRenewal(): Promise<ActionResult> {
  try {
    await assertCanManageBilling();
    await subscriptionGateway.cancelSubscription();
  } catch (err) {
    console.error("Failed to cancel subscription", err);
    return toActionError(err);
  }
  revalidatePath("/subscription", "layout");
  return ok();
}

/** Undo a pending cancellation so the subscription renews normally. */
export async function resumeSubscription(): Promise<ActionResult> {
  try {
    await assertCanManageBilling();
    await subscriptionGateway.resumeSubscription();
  } catch (err) {
    console.error("Failed to resume subscription", err);
    return toActionError(err);
  }
  revalidatePath("/subscription", "layout");
  return ok();
}

export async function updateSeats(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const quantity = getInt(formData, "quantity");
  if (quantity === undefined || quantity < 1 || quantity > MAX_SEATS) {
    return fail("invalid_seat_count");
  }

  try {
    await assertCanManageBilling();
    await subscriptionGateway.updateSeats(quantity);
  } catch (err) {
    console.error("Failed to update seats", err);
    return toActionError(err);
  }
  revalidatePath("/org", "layout");
  revalidatePath("/subscription", "layout");
  return ok();
}
