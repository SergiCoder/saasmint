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
  id: string;
  status: SubscriptionStatus;
  plan: Plan;
  quantity: number;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt: string | null;
  createdAt: string;
}
