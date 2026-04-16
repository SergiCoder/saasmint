import { cache } from "react";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import { orgMemberGateway } from "@/infrastructure/registry";
import type { OrgMember } from "@/domain/models/OrgMember";

/**
 * Fetches the members of a given org.
 * Wrapped with React.cache() so that multiple callers in a single render pass
 * (e.g. layout + page, or subscription page + canManageBilling) share a
 * single API call per org id.
 */
export const getOrgMembers = cache(async function getOrgMembers(
  orgId: string,
): Promise<OrgMember[]> {
  try {
    return await new ListOrgMembers(orgMemberGateway).execute(orgId);
  } catch (err) {
    console.error("Failed to list org members", err);
    return [];
  }
});
