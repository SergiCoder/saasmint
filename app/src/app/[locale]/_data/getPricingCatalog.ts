import type { Plan } from "@/domain/models/Plan";
import type { Product } from "@/domain/models/Product";
import type { Subscription } from "@/domain/models/Subscription";
import type { Org } from "@/domain/models/Org";
import type { User } from "@/domain/models/User";
import { getPlans } from "./getPlans";
import { getProducts } from "./getProducts";
import { getSubscriptions } from "./getSubscriptions";
import { getUserOrgs } from "./getUserOrgs";

export interface PricingCatalog {
  plans: Plan[];
  subscriptions: Subscription[];
  products: Product[];
  userOrgs: Org[];
}

/**
 * Currency-aware fan-out of the four catalog fetches both the subscription
 * page and the marketing pricing page need: plans, subscriptions, products,
 * and the caller's orgs. Anonymous callers (`user === null`) skip the
 * authenticated subscription/products/orgs reads and fall back to empty
 * lists so the marketing page can render without a session.
 *
 * The callers chain off this so the four roundtrips overlap with translation
 * loads on the same `Promise.all`. Returns plain data — derivations like
 * `canManageBilling` and org-owner role live with the page that needs them.
 */
export function getPricingCatalog(user: User | null): Promise<PricingCatalog> {
  const currency = user?.preferredCurrency;
  return Promise.all([
    getPlans(currency),
    user ? getSubscriptions(currency) : Promise.resolve([]),
    user ? getProducts(currency) : Promise.resolve([]),
    user ? getUserOrgs() : Promise.resolve([]),
  ]).then(([plans, subscriptions, products, userOrgs]) => ({
    plans,
    subscriptions,
    products,
    userOrgs,
  }));
}
