import type { ICreditsGateway } from "@/application/ports/ICreditsGateway";
import type { CreditBalance } from "@/domain/models/CreditBalance";
import { apiFetch } from "./apiClient";
import { CreditBalanceListResponseSchema } from "./schemas";

export class DjangoApiCreditsGateway implements ICreditsGateway {
  async listBalances(): Promise<CreditBalance[]> {
    const raw = await apiFetch<Record<string, unknown>>("/billing/credits/me/");
    return CreditBalanceListResponseSchema.parse(raw).balances;
  }
}
