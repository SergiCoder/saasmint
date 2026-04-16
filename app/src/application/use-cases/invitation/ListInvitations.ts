import type { Invitation } from "@/domain/models/Invitation";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

export class ListInvitations {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(orgId: string): Promise<Invitation[]> {
    return this.invitations.listInvitations(orgId);
  }
}
