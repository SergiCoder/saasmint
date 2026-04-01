import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

export class RemoveOrgMember {
  constructor(private readonly members: IOrgMemberGateway) {}

  async execute(orgId: string, userId: string): Promise<void> {
    return this.members.removeMember(orgId, userId);
  }
}
