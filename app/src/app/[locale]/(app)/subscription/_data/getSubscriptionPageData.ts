import { planGateway, productGateway } from "@/infrastructure/registry";
import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import type { Subscription } from "@/domain/models/Subscription";
import type { Org } from "@/domain/models/Org";
import type { User } from "@/domain/models/User";
import { getSubscription } from "../../_data/getSubscription";
import { getUserOrgs } from "../../_data/getUserOrgs";
import { getOrgMembers } from "../../_data/getOrgMembers";
import { canManageBilling } from "./canManageBilling";

export interface SubscriptionPageData {
  subscription: Subscription | null;
  plans: Plan[];
  products: Product[];
  userOrgs: Org[];
  canManage: boolean;
  teamOwnerName: string | null;
}

/**
 * Fan-out data loader for the subscription page. Fetches subscription, plans,
 * products, and orgs in parallel; resolves `canManage` and the team owner
 * name (for team plans) once the subscription is in hand. Each call-site
 * gateway failure collapses to an empty result so the page can still render.
 */
export async function getSubscriptionPageData(
  user: User,
): Promise<SubscriptionPageData> {
  const currency = user.preferredCurrency;

  const [subscription, plans, products, userOrgs] = await Promise.all([
    getSubscription(currency),
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

  const canManage = subscription
    ? await canManageBilling(user, subscription)
    : false;

  let teamOwnerName: string | null = null;
  const firstOrg = userOrgs.at(0);
  if (subscription?.plan.context === "team" && firstOrg) {
    const members = await getOrgMembers(firstOrg.id);
    const owner = members.find((m) => m.role === "owner");
    if (owner) teamOwnerName = owner.user.fullName;
  }

  return { subscription, plans, products, userOrgs, canManage, teamOwnerName };
}
