"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BillingError } from "@/domain/errors/BillingError";
import {
  findPersonalSubscription,
  findTeamSubscription,
  type Subscription,
} from "@/domain/models/Subscription";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import { productGateway, subscriptionGateway } from "@/infrastructure/registry";
import { AuthError } from "@/domain/errors/AuthError";
import { canManageBilling } from "@/app/[locale]/(app)/subscription/_data/canManageBilling";
import { getCurrentUserIdFromCookie } from "@/lib/jwt";
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
  // The user ID comes straight from the JWT cookie — the proxy middleware
  // has already verified the token's expiry and the backend re-validates on
  // every API call. Fetching the full /account/ payload here would add a
  // round-trip to every billing mutation just to read `id`.
  const userId = await getCurrentUserIdFromCookie();
  if (!userId) {
    throw new AuthError("No active session", "NO_SESSION");
  }
  const subscriptions = await subscriptionGateway.listSubscriptions();
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
  if (!(await canManageBilling(userId, subscription))) {
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

  // Form field name `seatLimit` mirrors the new backend wire field
  // (`seat_limit`, renamed from `quantity` in v0.8.0). Backend enforces
  // bounds (1–10000); the action just forwards a positive integer.
  const rawSeatLimit = getInt(formData, "seatLimit");
  const seatLimit = rawSeatLimit && rawSeatLimit > 0 ? rawSeatLimit : undefined;
  const orgName = getNonEmptyString(formData, "orgName");
  const keepPersonalSubscription =
    formData.get("keepPersonalSubscription") === "on";

  let url: string;
  try {
    const session = await subscriptionGateway.createCheckoutSession({
      planPriceId,
      ...(seatLimit ? { seatLimit } : {}),
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
  let url: string | null = null;
  try {
    await assertCanManageBilling(context);
    const session = await subscriptionGateway.createBillingPortalSession({
      returnUrl: `${APP_ORIGIN}/subscription`,
      ...(context ? { context } : {}),
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
 * Switch the active subscription to `planPriceId`. Backend applies upgrades
 * and same-amount switches immediately; downgrades are deferred to period
 * end and surface as `scheduledPlan` + `scheduledChangeAt` on the returned
 * subscription. Returns `fail("already_on_plan")` when the target equals
 * the current price (HTTP 409).
 */
export async function changePlan(
  planPriceId: string,
  context?: SubscriptionContext,
): Promise<ActionResult<{ deferred: boolean }>> {
  if (!planPriceId) return fail("invalid_input");
  const safeContext = normalizeContext(context);
  try {
    await assertCanManageBilling(safeContext);
    const updated = await subscriptionGateway.changePlan(
      planPriceId,
      safeContext,
    );
    revalidatePath("/subscription", "layout");
    return ok({ deferred: updated.scheduledChangeAt !== null });
  } catch (err) {
    console.error("Failed to change plan", err);
    return toActionError(err);
  }
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
  // Form field name `seatLimit` matches the new backend wire field. Lower
  // bound 1 stays client-side because submitting 0/negative is a UI bug;
  // upper bound is the backend's call (no hard-coded constant on FE).
  const seatLimit = getInt(formData, "seatLimit");
  if (seatLimit === undefined || seatLimit < 1) {
    return fail("invalid_seat_count");
  }
  const context = parseContext(formData);

  try {
    await assertCanManageBilling(context);
    await subscriptionGateway.updateSeats(seatLimit, context);
  } catch (err) {
    console.error("Failed to update seats", err);
    return toActionError(err);
  }
  revalidatePath("/org", "layout");
  revalidatePath("/subscription", "layout");
  return ok();
}
