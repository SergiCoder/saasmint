import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import {
  findPersonalSubscription,
  findTeamSubscription,
  type Subscription,
} from "@/domain/models/Subscription";
import type { Org } from "@/domain/models/Org";
import type { OrgMember } from "@/domain/models/OrgMember";
import type { User } from "@/domain/models/User";
import { getOrgMembers } from "../../../_data/getOrgMembers";
import { getPricingCatalog } from "../../../_data/getPricingCatalog";
import { canManageBilling } from "./canManageBilling";

async function resolveOrgOwnerInfo(
  team: Subscription | null,
  firstOrg: Org | undefined,
  userId: string,
  orgMembersPromise: Promise<readonly OrgMember[]>,
): Promise<{ teamOwnerName: string | null; isCurrentUserOrgOwner: boolean }> {
  if (!firstOrg) return { teamOwnerName: null, isCurrentUserOrgOwner: false };
  const members = await orgMembersPromise;
  const owner = members.find((m) => m.role === "owner");
  return {
    teamOwnerName: team && owner ? (owner.user.fullName ?? null) : null,
    isCurrentUserOrgOwner: owner?.user.id === userId,
  };
}

export interface SubscriptionPageData {
  /**
   * Active subscriptions, in stable order: personal first, then team. 0–2 rows
   * (free tier, single sub, or concurrent personal+team — rule 5).
   */
  subscriptions: Subscription[];
  plans: Plan[];
  products: Product[];
  userOrgs: Org[];
  /**
   * Per-subscription "can the caller manage billing on this row" flags,
   * keyed by `subscription.id`. Personal subs are always manageable by their
   * owner; team subs only by the org's billing member.
   */
  canManageById: Partial<Record<string, boolean>>;
  teamOwnerName: string | null;
  /**
   * Whether the caller is the owner of their (first) org. Drives the rule-5b
   * product-checkout picker — only org owners with concurrent personal+team
   * subs need to disambiguate which Stripe customer to charge.
   */
  isCurrentUserOrgOwner: boolean;
}

/**
 * Fan-out data loader for the subscription page. Fetches the user's
 * subscriptions, plans, products, and orgs in parallel. Each gateway
 * failure collapses to an empty result so the page can still render.
 */
export async function getSubscriptionPageData(
  user: User,
): Promise<SubscriptionPageData> {
  const {
    plans,
    subscriptions: rawSubscriptions,
    products,
    userOrgs,
  } = await getPricingCatalog(user);

  // Stable order: personal first, then team. The current-subscription card(s)
  // render in this order on the subscription page.
  const personal = findPersonalSubscription(rawSubscriptions);
  const team = findTeamSubscription(rawSubscriptions);
  const subscriptions = [
    ...(personal ? [personal] : []),
    ...(team ? [team] : []),
  ];

  // Resolve canManage flags and the org-owner info in parallel — both reach
  // for the same React-cached getOrgMembers(firstOrg.id) call, so running
  // them concurrently lets the later one short-circuit on the shared cache
  // entry instead of waiting for the first to finish.
  const firstOrg = userOrgs.at(0);
  const orgMembersPromise = firstOrg
    ? getOrgMembers(firstOrg.id)
    : Promise.resolve([]);
  const [canManageEntries, ownerInfo] = await Promise.all([
    Promise.all(
      subscriptions.map(
        async (s) => [s.id, await canManageBilling(user.id, s)] as const,
      ),
    ),
    resolveOrgOwnerInfo(team, firstOrg, user.id, orgMembersPromise),
  ]);
  const canManageById = Object.fromEntries(canManageEntries);
  const { teamOwnerName, isCurrentUserOrgOwner } = ownerInfo;

  return {
    subscriptions,
    plans,
    products,
    userOrgs,
    canManageById,
    teamOwnerName,
    isCurrentUserOrgOwner,
  };
}
