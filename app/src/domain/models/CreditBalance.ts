/**
 * One scope of the caller's credit balance. Concurrent personal+team billers
 * (rule 5) get two rows — one `user`-scoped and one `org`-scoped; everyone
 * else gets at most one. Free-tier users with no credits get an empty list.
 */
export interface CreditBalance {
  readonly balance: number;
  readonly scope: "user" | "org";
}
