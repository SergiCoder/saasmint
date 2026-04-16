import type {
  IOrgGateway,
  UpdateOrgInput,
} from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch } from "./apiClient";

export class DjangoApiOrgGateway implements IOrgGateway {
  async getOrg(orgId: string): Promise<Org> {
    return apiFetch<Org>(`/orgs/${orgId}/`);
  }

  async updateOrg(orgId: string, input: UpdateOrgInput): Promise<Org> {
    return apiFetch<Org>(`/orgs/${orgId}/`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async listUserOrgs(_userId: string): Promise<Org[]> {
    const data = await apiFetch<{ results: Org[] }>("/orgs/");
    return data.results;
  }

  async deleteOrg(orgId: string): Promise<void> {
    await apiFetch<void>(`/orgs/${orgId}/`, { method: "DELETE" });
  }
}
