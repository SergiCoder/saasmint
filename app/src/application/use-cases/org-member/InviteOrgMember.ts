import type { OrgMember } from "@/domain/models/OrgMember";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

export class AddOrgMember {
  constructor(private readonly members: IOrgMemberGateway) {}

  async execute(
    orgId: string,
    userId: string,
    role: OrgMember["role"],
  ): Promise<void> {
    return this.members.addMember(orgId, userId, role);
  }
}
