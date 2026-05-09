import type { IOrgGateway } from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { parseOrg, parsePaginated } from "./parsers";

export class DjangoApiOrgGateway implements IOrgGateway {
  async listUserOrgs(): Promise<Org[]> {
    const data = await apiFetch<Record<string, unknown>>("/orgs/");
    return parsePaginated(data, parseOrg);
  }

  async deleteOrg(orgId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${encodeURIComponent(orgId)}/`, {
      method: "DELETE",
    });
  }
}
