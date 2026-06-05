import type { CreditBalance } from "@/domain/models/CreditBalance";

export interface ICreditsGateway {
  listBalances(): Promise<CreditBalance[]>;
}
