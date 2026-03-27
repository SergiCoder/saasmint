import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";
import { apiFetch, getAuthToken } from "./apiClient";

export class DjangoApiOrgMemberGateway implements IOrgMemberGateway {
  async listMembers(orgId: string): Promise<OrgMember[]> {
    const token = await getAuthToken();
    const data = await apiFetch<{ results: OrgMember[] }>(
      `/orgs/${orgId}/members/`,
      token,
    );
    return data.results;
  }

  async inviteMember(
    orgId: string,
    email: string,
    role: OrgMember["role"],
  ): Promise<void> {
    const token = await getAuthToken();
    await apiFetch<OrgMember>(`/orgs/${orgId}/members/`, token, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    const token = await getAuthToken();
    await apiFetch<void>(`/orgs/${orgId}/members/${userId}/`, token, {
      method: "DELETE",
    });
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void> {
    const token = await getAuthToken();
    await apiFetch<OrgMember>(`/orgs/${orgId}/members/${userId}/`, token, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }
}
