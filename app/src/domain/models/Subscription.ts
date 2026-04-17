import type { Plan } from "./Plan";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/** Maximum number of seats allowed on a team subscription. */
export const MAX_SEATS = 100;

export interface Subscription {
  readonly id: string;
  readonly status: SubscriptionStatus;
  readonly plan: Plan;
  readonly quantity: number;
  readonly trialEndsAt: string | null;
  readonly currentPeriodStart: string;
  readonly currentPeriodEnd: string;
  readonly canceledAt: string | null;
  readonly createdAt: string;
}
