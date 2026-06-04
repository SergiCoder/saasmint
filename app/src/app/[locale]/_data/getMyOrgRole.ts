import { cache } from "react";
import type { OrgMember } from "@/domain/models/OrgMember";
import { getCurrentUser } from "./getCurrentUser";
import { getOrgMembers } from "./getOrgMembers";
import { getUserOrgs } from "./getUserOrgs";

/**
 * Returns the current user's role in their first (and currently only) org,
 * or null when they have no orgs. Used by pages that need to gate actions on
 * org membership without duplicating the layered fetch logic.
 *
 * Fails conservatively to "member" on any gateway error so delete/transfer
 * restrictions remain in effect even if the member list can't be loaded.
 *
 * Wrapped with React.cache() so callers within a single server render share
 * one resolution per request.
 */
export const getMyOrgRole = cache(async function getMyOrgRole(): Promise<
  OrgMember["role"] | null
> {
  const [user, orgs] = await Promise.all([getCurrentUser(), getUserOrgs()]);
  const firstOrg = orgs.at(0);
  if (!firstOrg) return null;
  try {
    const members = await getOrgMembers(firstOrg.id);
    const me = members.find((m) => m.user.id === user.id);
    return me?.role ?? "member";
  } catch {
    return "member";
  }
});
