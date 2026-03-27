import type {
  CreateOrgInput,
  IOrgGateway,
  UpdateOrgInput,
} from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch, getAuthToken } from "./apiClient";

export class DjangoApiOrgGateway implements IOrgGateway {
  async createOrg(input: CreateOrgInput): Promise<Org> {
    const token = await getAuthToken();
    return apiFetch<Org>("/orgs/", token, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getOrg(orgId: string): Promise<Org> {
    const token = await getAuthToken();
    return apiFetch<Org>(`/orgs/${orgId}/`, token);
  }

  async updateOrg(orgId: string, input: UpdateOrgInput): Promise<Org> {
    const token = await getAuthToken();
    return apiFetch<Org>(`/orgs/${orgId}/`, token, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async listUserOrgs(_userId: string): Promise<Org[]> {
    const token = await getAuthToken();
    const data = await apiFetch<{ results: Org[] }>("/orgs/", token);
    return data.results;
  }
}
