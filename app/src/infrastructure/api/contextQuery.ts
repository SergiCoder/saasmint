import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";

/**
 * Builds the `?context=...` query suffix for billing endpoints that accept
 * a personal/team disambiguator (subscription mutations, product checkout).
 *
 * Defense-in-depth: even though the type narrows to a literal union, server
 * actions hand untrusted RPC arguments to the gateway. Only emit the query
 * for values that exactly match the whitelist; drop anything else silently
 * so a tampered payload can't inject extra params or path characters.
 */
export function contextQuery(context: SubscriptionContext | undefined): string {
  if (context !== "personal" && context !== "team") return "";
  return `?context=${context}`;
}
