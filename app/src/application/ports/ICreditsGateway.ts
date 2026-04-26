import type { CreditBalance } from "@/domain/models/CreditBalance";

export interface ICreditsGateway {
  getBalance(): Promise<CreditBalance>;
}
