"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CancelSubscription } from "@/application/use-cases/billing/CancelSubscription";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { GetSubscription } from "@/application/use-cases/billing/GetSubscription";
import { OpenBillingPortal } from "@/application/use-cases/billing/OpenBillingPortal";
import { ResumeSubscription } from "@/application/use-cases/billing/ResumeSubscription";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { BillingError } from "@/domain/errors/BillingError";
import { authGateway, subscriptionGateway } from "@/infrastructure/registry";
import { canManageBilling } from "@/app/[locale]/(app)/subscription/_data/canManageBilling";
import {
  APP_ORIGIN,
  assertTrustedRedirect,
} from "@/app/[locale]/(app)/subscription/_data/trustedRedirect";

const MAX_CHECKOUT_QUANTITY = 100;

export async function startCheckout(formData: FormData) {
  const planPriceId = formData.get("planPriceId");
  const quantityRaw = formData.get("quantity");

  if (typeof planPriceId !== "string") {
    return;
  }

  let quantity: number | undefined;
  if (typeof quantityRaw === "string" && quantityRaw) {
    const parsed = parseInt(quantityRaw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      quantity = Math.min(parsed, MAX_CHECKOUT_QUANTITY);
    }
  }

  let url: string | null = null;
  try {
    const session = await new StartCheckout(subscriptionGateway).execute({
      planPriceId,
      ...(quantity ? { quantity } : {}),
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to start checkout", err);
  }

  if (!url) return;
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
  revalidatePath("/[locale]/subscription", "page");
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
  revalidatePath("/[locale]/subscription", "page");
  return { ok: true };
}
