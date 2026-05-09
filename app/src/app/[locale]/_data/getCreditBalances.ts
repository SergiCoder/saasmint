import { cache } from "react";
import { creditsGateway } from "@/infrastructure/registry";
import type { CreditBalance } from "@/domain/models/CreditBalance";

/**
 * Fetches the caller's credit balances, returning [] on any failure (network
 * blip, schema mismatch, etc.). Credits are a non-critical surface — never
 * block the subscription page render on them. Wrapped in React.cache() so
 * multiple components in one render share the call.
 */
export const getCreditBalances = cache(
  async function getCreditBalances(): Promise<CreditBalance[]> {
    return creditsGateway.listBalances().catch(() => []);
  },
);
