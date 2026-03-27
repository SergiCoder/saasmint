import type { OrgMember } from "@/domain/models/OrgMember";

export interface IOrgMemberGateway {
  listMembers(orgId: string): Promise<OrgMember[]>;
  inviteMember(
    orgId: string,
    email: string,
    role: OrgMember["role"],
  ): Promise<void>;
  removeMember(orgId: string, userId: string): Promise<void>;
  updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void>;
}
