import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

export class AcceptInvitation {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(
    token: string,
    input: { fullName: string; password: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.invitations.acceptInvitation(token, input);
  }
}
