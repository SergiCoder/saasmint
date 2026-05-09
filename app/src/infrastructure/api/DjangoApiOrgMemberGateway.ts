import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";
import { apiFetch, apiFetchVoid } from "./apiClient";
import { parseMember, parsePaginated } from "./parsers";

export class DjangoApiOrgMemberGateway implements IOrgMemberGateway {
  async listMembers(orgId: string): Promise<OrgMember[]> {
    const data = await apiFetch<Record<string, unknown>>(
      `/orgs/${encodeURIComponent(orgId)}/members/`,
    );
    return parsePaginated(data, parseMember);
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await apiFetchVoid(
      `/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}/`,
      { method: "DELETE" },
    );
  }

  async updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void> {
    await apiFetchVoid(
      `/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}/`,
      {
        method: "PATCH",
        body: JSON.stringify({ role }),
      },
    );
  }

  async transferOwnership(orgId: string, userId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${encodeURIComponent(orgId)}/owner/`, {
      method: "PUT",
      body: JSON.stringify({ user_id: userId }),
    });
  }
}
