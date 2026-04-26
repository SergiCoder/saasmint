import type { ICreditsGateway } from "@/application/ports/ICreditsGateway";
import type { CreditBalance } from "@/domain/models/CreditBalance";
import { apiFetch } from "./apiClient";
import { CreditBalanceSchema } from "./schemas";

export class DjangoApiCreditsGateway implements ICreditsGateway {
  async getBalance(): Promise<CreditBalance> {
    const raw = await apiFetch<Record<string, unknown>>("/billing/credits/me/");
    return CreditBalanceSchema.parse(raw);
  }
}
