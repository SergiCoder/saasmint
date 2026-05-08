import { planGateway, productGateway } from "@/infrastructure/registry";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import {
  findPersonalSubscription,
  findTeamSubscription,
  type Subscription,
} from "@/domain/models/Subscription";
import type { Org } from "@/domain/models/Org";
import type { User } from "@/domain/models/User";
import { getSubscriptions } from "../../_data/getSubscriptions";
import { getUserOrgs } from "../../_data/getUserOrgs";
import { getOrgMembers } from "../../_data/getOrgMembers";
import { canManageBilling } from "./canManageBilling";

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
  const currency = user.preferredCurrency;

  const [rawSubscriptions, plans, products, userOrgs] = await Promise.all([
    getSubscriptions(currency),
    planGateway.listPlans(currency).catch((err: unknown): Plan[] => {
      console.error("Failed to fetch plans", err);
      return [];
    }),
    productGateway.listProducts(currency).catch((err: unknown): Product[] => {
      console.error("Failed to fetch products", err);
      return [];
    }),
    getUserOrgs(),
  ]);

  // Stable order: personal first, then team. The current-subscription card(s)
  // render in this order on the subscription page.
  const personal = findPersonalSubscription(rawSubscriptions);
  const team = findTeamSubscription(rawSubscriptions);
  const subscriptions = [
    ...(personal ? [personal] : []),
    ...(team ? [team] : []),
  ];

  // Resolve canManage flags, the team owner's name, and the caller's own
  // role in parallel — they all reach for the same React-cached
  // getOrgMembers(firstOrg.id) call, so running them concurrently lets the
  // later ones short-circuit on the shared cache entry instead of waiting
  // for the first to finish.
  const firstOrg = userOrgs.at(0);
  const orgMembersPromise = firstOrg
    ? getOrgMembers(firstOrg.id)
    : Promise.resolve([]);
  const [canManageEntries, teamOwnerName, isCurrentUserOrgOwner] =
    await Promise.all([
      Promise.all(
        subscriptions.map(
          async (s) => [s.id, await canManageBilling(user.id, s)] as const,
        ),
      ),
      (async (): Promise<string | null> => {
        if (!team || !firstOrg) return null;
        const members = await orgMembersPromise;
        const owner = members.find((m) => m.role === "owner");
        return owner?.user.fullName ?? null;
      })(),
      (async (): Promise<boolean> => {
        if (!firstOrg) return false;
        const members = await orgMembersPromise;
        return members.some((m) => m.user.id === user.id && m.role === "owner");
      })(),
    ]);
  const canManageById = Object.fromEntries(canManageEntries);

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
