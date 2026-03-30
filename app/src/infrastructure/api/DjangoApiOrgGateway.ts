import type {
  CreateOrgInput,
  IOrgGateway,
  UpdateOrgInput,
} from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch } from "./apiClient";

export class DjangoApiOrgGateway implements IOrgGateway {
  async createOrg(input: CreateOrgInput): Promise<Org> {
    return apiFetch<Org>("/orgs/", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

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
}
