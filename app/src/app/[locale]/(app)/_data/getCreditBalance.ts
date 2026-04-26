import { cache } from "react";
import { creditsGateway } from "@/infrastructure/registry";
import type { CreditBalance } from "@/domain/models/CreditBalance";

/**
 * Fetches the caller's credit balance, returning null on any failure (network
 * blip, org-member with no active org → backend 404, etc.). Credits are a
 * non-critical surface — never block the subscription page render on them.
 * Wrapped in React.cache() so multiple components in one render share the call.
 */
export const getCreditBalance = cache(
  async function getCreditBalance(): Promise<CreditBalance | null> {
    return creditsGateway.getBalance().catch(() => null);
  },
);
