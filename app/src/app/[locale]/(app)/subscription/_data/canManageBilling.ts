import { cache } from "react";
import type { Org } from "@/domain/models/Org";
import type { Subscription } from "@/domain/models/Subscription";
import { getOrgMembers } from "../../_data/getOrgMembers";
import { getUserOrgs } from "../../_data/getUserOrgs";

/**
 * Returns whether the user identified by `userId` is allowed to manage
 * (cancel/resume) the given subscription. Personal subscriptions are always
 * manageable by their owner. Team subscriptions are only manageable by the
 * member flagged as `isBilling` in the org.
 *
 * Wrapped with React.cache() so that a single render pass doesn't duplicate
 * the org + member lookups. Server-action callers can pass `preloadedOrgs`
 * when they have already kicked off `getUserOrgs()` in parallel with
 * `listSubscriptions()` — `React.cache` does not deduplicate across
 * server-action invocations, so the preload avoids a serial round-trip.
 */
export const canManageBilling = cache(async function canManageBilling(
  userId: string,
  subscription: Subscription,
  options?: { preloadedOrgs?: readonly Org[] },
): Promise<boolean> {
  if (subscription.plan.context === "personal") return true;

  try {
    const orgs = options?.preloadedOrgs ?? (await getUserOrgs());
    // Team subscriptions belong to the user's first (currently only) org.
    const org = orgs[0];
    if (!org) return false;

    const members = await getOrgMembers(org.id);
    const me = members.find((m) => m.user.id === userId);
    return me?.isBilling === true;
  } catch (err) {
    console.error("Failed to resolve billing permissions", err);
    return false;
  }
});
