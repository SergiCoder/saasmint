import { cache } from "react";
import { invitationGateway } from "@/infrastructure/registry";
import type { Invitation } from "@/domain/models/Invitation";

/**
 * Fetches the pending invitations for an org. Wrapped with React.cache so
 * that the org page and any layout/component on the same render pass share
 * a single API call.
 */
export const getOrgInvitations = cache(async function getOrgInvitations(
  orgId: string,
): Promise<Invitation[]> {
  return invitationGateway.listInvitations(orgId).catch(() => []);
});
