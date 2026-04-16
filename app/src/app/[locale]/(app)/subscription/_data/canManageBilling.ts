import { cache } from "react";
import type { Subscription } from "@/domain/models/Subscription";
import type { User } from "@/domain/models/User";
import { getOrgMembers } from "../../_data/getOrgMembers";
import { getUserOrgs } from "../../_data/getUserOrgs";

/**
 * Returns whether the given user is allowed to manage (cancel/resume) the
 * given subscription. Personal subscriptions are always manageable by their
 * owner. Team subscriptions are only manageable by the member flagged as
 * `isBilling` in the org.
 *
 * Wrapped with React.cache() so that a single render pass doesn't duplicate
 * the org + member lookups.
 */
export const canManageBilling = cache(async function canManageBilling(
  user: User,
  subscription: Subscription,
): Promise<boolean> {
  if (subscription.plan.context === "personal") return true;

  try {
    const orgs = await getUserOrgs(user.id);
    if (orgs.length === 0) return false;

    // Team subscriptions belong to the user's first (currently only) org.
    const org = orgs[0];
    const members = await getOrgMembers(org.id);
    const me = members.find((m) => m.user.id === user.id);
    return me?.isBilling === true;
  } catch (err) {
    console.error("Failed to resolve billing permissions", err);
    return false;
  }
});
