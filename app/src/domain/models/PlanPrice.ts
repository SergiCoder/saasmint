export interface PlanPrice {
  readonly id: string;
  readonly amount: number;
  readonly displayAmount: number;
  readonly currency: string;
  readonly localDisplayAmount: number | null;
  readonly localCurrency: string | null;
}
