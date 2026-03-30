import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";
import { apiFetch } from "./apiClient";

export class DjangoApiOrgMemberGateway implements IOrgMemberGateway {
  async listMembers(orgId: string): Promise<OrgMember[]> {
    const data = await apiFetch<{ results: OrgMember[] }>(
      `/orgs/${orgId}/members/`,
    );
    return data.results;
  }

  async inviteMember(
    orgId: string,
    email: string,
    role: OrgMember["role"],
  ): Promise<void> {
    await apiFetch<OrgMember>(`/orgs/${orgId}/members/`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await apiFetch<void>(`/orgs/${orgId}/members/${userId}/`, {
      method: "DELETE",
    });
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void> {
    await apiFetch<OrgMember>(`/orgs/${orgId}/members/${userId}/`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }
}
