import type { OrgMember } from "@/domain/models/OrgMember";

export interface IOrgMemberGateway {
  listMembers(orgId: string): Promise<OrgMember[]>;
  removeMember(orgId: string, userId: string): Promise<void>;
  updateMemberRole(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void>;
  leaveOrg(orgId: string): Promise<void>;
  transferOwnership(orgId: string, userId: string): Promise<void>;
}
