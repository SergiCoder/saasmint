import { cache } from "react";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import { orgGateway } from "@/infrastructure/registry";
import type { Org } from "@/domain/models/Org";

/**
 * Fetches the organisations the current user belongs to.
 * Wrapped with React.cache() so that layout + page share a single API call
 * per server render pass.
 */
export const getUserOrgs = cache(async function getUserOrgs(
  userId: string,
): Promise<Org[]> {
  return new ListUserOrgs(orgGateway).execute(userId).catch(() => []);
});
