import type { Plan } from "./Plan";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export interface Subscription {
  id: string;
  stripeId: string;
  status: SubscriptionStatus;
  plan: Pick<Plan, "id" | "name" | "context" | "interval">;
  quantity: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}
