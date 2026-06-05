import type { Org } from "@/domain/models/Org";
import type { Subscription } from "@/domain/models/Subscription";
import { findTeamSubscription } from "@/domain/models/Subscription";

/**
 * The "Org" link appears in the user menu when the viewer either has an active
 * team subscription (they pay for it) or belongs to at least one organisation
 * (they were invited). Both layouts ((app) and (marketing)) compute this the
 * same way, so the predicate lives here to keep the two in sync.
 */
export function hasOrgAccess(
  subscriptions: Subscription[],
  userOrgs: Org[],
): boolean {
  return findTeamSubscription(subscriptions) !== null || userOrgs.length > 0;
}
