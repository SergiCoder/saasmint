/**
 * Caller's current credit balance and the scope it belongs to. PERSONAL users
 * see their own balance; ORG_MEMBER users see their org's shared balance —
 * the backend resolves the right scope per request.
 */
export interface CreditBalance {
  readonly balance: number;
  readonly scope: "user" | "org";
}
