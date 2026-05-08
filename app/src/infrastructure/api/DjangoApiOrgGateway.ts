import type { IOrgGateway } from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { parseOrg } from "./parsers";

export class DjangoApiOrgGateway implements IOrgGateway {
  async listUserOrgs(): Promise<Org[]> {
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      "/orgs/",
    );
    return data.results.map(parseOrg);
  }

  async deleteOrg(orgId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${orgId}/`, { method: "DELETE" });
  }
}
