import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

export class LeaveOrg {
  constructor(private readonly members: IOrgMemberGateway) {}

  async execute(orgId: string): Promise<void> {
    return this.members.leaveOrg(orgId);
  }
}
