import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";
import type { Invitation } from "@/domain/models/Invitation";

export class GetInvitationByToken {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(token: string): Promise<Invitation> {
    return this.invitations.getByToken(token);
  }
}
