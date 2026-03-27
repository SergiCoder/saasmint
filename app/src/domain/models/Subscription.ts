export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"

export interface Subscription {
  id: string
  stripeId: string
  status: SubscriptionStatus
  plan: {
    id: string
    name: string
    context: "personal" | "team"
    interval: "month" | "year"
  }
  quantity: number
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  trialEnd: string | null
}
