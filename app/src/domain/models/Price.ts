export interface Price {
  readonly id: string;
  readonly amount: number;
  readonly displayAmount: number;
  readonly currency: string;
  readonly localDisplayAmount: number | null;
  readonly localCurrency: string | null;
  /**
   * True when `displayAmount` is a per-country tax-INCLUSIVE sticker (render an
   * "incl. VAT" hint). False for the USD/per-currency fallback, which is
   * tax-exclusive — destination VAT is added at checkout.
   */
  readonly taxInclusive: boolean;
}

export const DEFAULT_CURRENCY = "usd";
