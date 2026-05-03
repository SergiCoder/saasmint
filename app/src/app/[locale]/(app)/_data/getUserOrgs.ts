import { cache } from "react";
import { orgGateway } from "@/infrastructure/registry";
import type { Org } from "@/domain/models/Org";

/**
 * Fetches the organisations the current user belongs to.
 * Wrapped with React.cache() so that layout + page share a single API call
 * per server render pass.
 */
export const getUserOrgs = cache(async function getUserOrgs(): Promise<Org[]> {
  return orgGateway.listUserOrgs().catch((err: unknown) => {
    console.error("Failed to fetch user orgs", err);
    return [];
  });
});
