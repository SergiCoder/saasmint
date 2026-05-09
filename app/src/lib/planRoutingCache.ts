import { planGateway } from "@/infrastructure/registry";

/**
 * Module-level cache of `priceId → context`. Server actions opt out of the
 * Next.js data cache (a `cookies()` read taints the whole action), so the
 * plan-gateway's `revalidate: 3600` hint is ignored from inside an action.
 * A process-scoped Map gets us back to a single backend round-trip per
 * process per TTL. The plan catalog is effectively static (catalog-level
 * data, not user-scoped), so a 1h TTL matches the gateway's cache hint.
 *
 * Lives in `src/lib/` rather than next to the action so it can expose a
 * synchronous `__reset` for tests — `"use server"` modules can only export
 * async functions, and those become public RPC endpoints.
 */

const PLAN_ROUTING_TTL_MS = 60 * 60 * 1000;

let planRoutingCache: {
  expiresAt: number;
  routing: Map<string, "personal" | "team">;
} | null = null;

export async function getPlanRouting(): Promise<
  Map<string, "personal" | "team">
> {
  const now = Date.now();
  if (planRoutingCache && planRoutingCache.expiresAt > now) {
    return planRoutingCache.routing;
  }
  const plans = await planGateway.listPlans();
  const routing = new Map<string, "personal" | "team">();
  for (const plan of plans) {
    if (plan.price) routing.set(plan.price.id, plan.context);
  }
  planRoutingCache = { expiresAt: now + PLAN_ROUTING_TTL_MS, routing };
  return routing;
}

/**
 * Test-only: drop the in-memory cache so each test sees a fresh gateway call.
 */
export function __resetPlanRoutingCacheForTests(): void {
  planRoutingCache = null;
}
