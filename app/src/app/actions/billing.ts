"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BillingError } from "@/domain/errors/BillingError";
import {
  findPersonalSubscription,
  findTeamSubscription,
  MAX_SEATS,
  type Subscription,
} from "@/domain/models/Subscription";
import type {
  BillingPortalFlow,
  SubscriptionContext,
} from "@/application/ports/ISubscriptionGateway";
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
 * Ensures the current user is allowed to manage billing on the subscription
 * matching `context` (or the only one when context is omitted). Throws a
 * BillingError otherwise. Defense-in-depth — the UI already hides the buttons
 * for non-billing members, and the Django API also enforces the rule.
 *
 * When the caller has BOTH a personal and a team subscription (rule 5
 * concurrent billing), `context` is required: otherwise the frontend gate
 * would authorize an arbitrary row while the backend dispatches on its own
 * default ("team" for org members, "personal" otherwise), letting the gate
 * silently authorize a different sub than the one being mutated.
 */
async function assertCanManageBilling(
  context?: SubscriptionContext,
): Promise<Subscription> {
  const [user, subscriptions] = await Promise.all([
    authGateway.getCurrentUser(),
    subscriptionGateway.listSubscriptions(),
  ]);
  let subscription: Subscription | null;
  if (context === "personal") {
    subscription = findPersonalSubscription(subscriptions);
  } else if (context === "team") {
    subscription = findTeamSubscription(subscriptions);
  } else if (subscriptions.length > 1) {
    // Concurrent personal+team billing: caller must disambiguate so the
    // authorization check operates on the same row the backend will mutate.
    throw new BillingError(
      "Subscription context is required when multiple subscriptions exist",
      "context_required",
    );
  } else {
    subscription = subscriptions[0] ?? null;
  }
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

  // Optional — only the rule-5b case (org owner with both subs) sends one;
  // everyone else lets the backend default route by account type.
  const context = parseContext(formData);

  let url: string;
  try {
    const session = await productGateway.createCheckoutSession({
      productPriceId,
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
      ...(context ? { context } : {}),
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

export async function openBillingPortal(formData?: FormData) {
  // Form-submitted context picks the Stripe customer the portal attaches to.
  // Concurrent billers (rule 5) MUST send it — otherwise the backend default
  // ("team" for org members, "personal" otherwise) would route a "manage
  // personal" click into the team portal. Single-context callers omit it.
  const context = formData ? parseContext(formData) : undefined;
  const flow = formData ? parseFlow(formData) : undefined;
  // `flow` is only set when `formData` is — but TS still needs the explicit
  // narrowing here since `formData` is the optional outer parameter.
  const planPriceId =
    flow && formData ? getString(formData, "planPriceId") : undefined;
  let url: string | null = null;
  try {
    await assertCanManageBilling(context);
    const session = await subscriptionGateway.createBillingPortalSession({
      returnUrl: `${APP_ORIGIN}/subscription`,
      ...(context ? { context } : {}),
      ...(flow ? { flow } : {}),
      ...(planPriceId ? { planPriceId } : {}),
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
 * Server actions are reachable as RPC endpoints — the TypeScript signature
 * does not survive the wire boundary. Normalize any caller-supplied value
 * down to the literal union (or `undefined`) before it touches authorization
 * checks or URL construction.
 */
function normalizeContext(value: unknown): SubscriptionContext | undefined {
  return value === "personal" || value === "team" ? value : undefined;
}

function parseContext(formData: FormData): SubscriptionContext | undefined {
  return normalizeContext(getString(formData, "context"));
}

function parseFlow(formData: FormData): BillingPortalFlow | undefined {
  const value = getString(formData, "flow");
  return value === "subscription_update_confirm" ? value : undefined;
}

/** Schedule the subscription to end at the current period's close. */
export async function cancelRenewal(
  context?: SubscriptionContext,
): Promise<ActionResult> {
  const safeContext = normalizeContext(context);
  try {
    await assertCanManageBilling(safeContext);
    await subscriptionGateway.cancelSubscription(safeContext);
  } catch (err) {
    console.error("Failed to cancel subscription", err);
    return toActionError(err);
  }
  revalidatePath("/subscription", "layout");
  return ok();
}

/** Undo a pending cancellation so the subscription renews normally. */
export async function resumeSubscription(
  context?: SubscriptionContext,
): Promise<ActionResult> {
  const safeContext = normalizeContext(context);
  try {
    await assertCanManageBilling(safeContext);
    await subscriptionGateway.resumeSubscription(safeContext);
  } catch (err) {
    console.error("Failed to resume subscription", err);
    return toActionError(err);
  }
  revalidatePath("/subscription", "layout");
  return ok();
}

/**
 * Release a pending deferred plan change so the current plan keeps running.
 * Backend is idempotent — calling this when no schedule exists is a no-op.
 */
export async function releaseScheduledChange(
  context?: SubscriptionContext,
): Promise<ActionResult> {
  const safeContext = normalizeContext(context);
  try {
    await assertCanManageBilling(safeContext);
    await subscriptionGateway.releaseScheduledChange(safeContext);
  } catch (err) {
    console.error("Failed to release scheduled plan change", err);
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
  const context = parseContext(formData);

  try {
    await assertCanManageBilling(context);
    await subscriptionGateway.updateSeats(quantity, context);
  } catch (err) {
    console.error("Failed to update seats", err);
    return toActionError(err);
  }
  revalidatePath("/org", "layout");
  revalidatePath("/subscription", "layout");
  return ok();
}
