import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";
import { apiFetch } from "./apiClient";
import { keysToCamel } from "./caseTransform";

function mapMember(raw: Record<string, unknown>): OrgMember {
  const member = keysToCamel<OrgMember>(raw);
  if (raw.user && typeof raw.user === "object") {
    member.user = keysToCamel(raw.user as Record<string, unknown>);
  }
  return member;
}

export class DjangoApiOrgMemberGateway implements IOrgMemberGateway {
  async listMembers(orgId: string): Promise<OrgMember[]> {
    const data = await apiFetch<Record<string, unknown>[]>(
      `/orgs/${orgId}/members/`,
    );
    return data.map(mapMember);
  }

  async addMember(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void> {
    await apiFetch<OrgMember>(`/orgs/${orgId}/members/`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId, role }),
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
