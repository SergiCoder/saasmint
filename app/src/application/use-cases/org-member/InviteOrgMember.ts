import type { OrgMember } from "@/domain/models/OrgMember";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

export class InviteOrgMember {
  constructor(private readonly members: IOrgMemberGateway) {}

  async execute(
    orgId: string,
    email: string,
    role: OrgMember["role"],
  ): Promise<void> {
    return this.members.inviteMember(orgId, email, role);
  }
}
