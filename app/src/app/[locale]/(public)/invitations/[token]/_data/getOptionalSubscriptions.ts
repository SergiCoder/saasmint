import { cache } from "react";
import { subscriptionGateway } from "@/infrastructure/registry";
import { AuthError } from "@/domain/errors/AuthError";
import type { Subscription } from "@/domain/models/Subscription";

/**
 * Fetch the caller's subscription list, returning `[]` for anonymous visitors
 * (`apiFetch` throws `AuthError("NO_SESSION")` without a token). Used by the
 * invitation acceptance page to detect the "concurrent billing" warning case
 * for signed-in invitees who already hold a personal subscription. Other
 * errors (network, schema, 5xx) still propagate to the error boundary.
 */
export const getOptionalSubscriptions = cache(
  async (): Promise<Subscription[]> => {
    try {
      return await subscriptionGateway.listSubscriptions();
    } catch (err) {
      if (err instanceof AuthError) return [];
      throw err;
    }
  },
);
