import { cache } from "react";
import { invitationGateway } from "@/infrastructure/registry";
import { ApiError } from "@/domain/errors/ApiError";
import type { PublicInvitation } from "@/domain/models/Invitation";

/**
 * Fetch a public invitation by its token. Returns `null` when the backend
 * answers `404` — both before the user accepts (token never existed) and
 * immediately after a successful accept (token was consumed and the form's
 * router.push hasn't completed yet). Any other error surfaces to the route
 * error boundary.
 */
export const getInvitationByToken = cache(
  async (token: string): Promise<PublicInvitation | null> => {
    try {
      return await invitationGateway.getByToken(token);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },
);
