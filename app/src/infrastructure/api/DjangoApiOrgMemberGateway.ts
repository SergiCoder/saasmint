import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { keysToCamel } from "./caseTransform";
import { OrgMemberSchema } from "./schemas";

function parseMember(raw: Record<string, unknown>): OrgMember {
  return OrgMemberSchema.parse(keysToCamel(raw));
}

export class DjangoApiOrgMemberGateway implements IOrgMemberGateway {
  async listMembers(orgId: string): Promise<OrgMember[]> {
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      `/orgs/${orgId}/members/`,
    );
    return data.results.map(parseMember);
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${orgId}/members/${userId}/`, {
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

  async leaveOrg(orgId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${orgId}/leave/`, { method: "POST" });
  }

  async transferOwnership(orgId: string, userId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${orgId}/owner/`, {
      method: "PUT",
      body: JSON.stringify({ user_id: userId }),
    });
  }
}
