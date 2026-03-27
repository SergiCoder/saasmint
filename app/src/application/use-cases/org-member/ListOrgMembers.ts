import type { OrgMember } from "@/domain/models/OrgMember";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

export class ListOrgMembers {
  constructor(private readonly members: IOrgMemberGateway) {}

  async execute(orgId: string): Promise<OrgMember[]> {
    return this.members.listMembers(orgId);
  }
}
