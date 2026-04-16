import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

export class CancelInvitation {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(orgId: string, invitationId: string): Promise<void> {
    return this.invitations.cancelInvitation(orgId, invitationId);
  }
}
