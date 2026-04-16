import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

export class TransferOwnership {
  constructor(private readonly members: IOrgMemberGateway) {}

  async execute(orgId: string, userId: string): Promise<void> {
    return this.members.transferOwnership(orgId, userId);
  }
}
