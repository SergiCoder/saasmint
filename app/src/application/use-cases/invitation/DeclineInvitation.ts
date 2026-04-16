import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

export class DeclineInvitation {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(token: string): Promise<void> {
    return this.invitations.declineInvitation(token);
  }
}
