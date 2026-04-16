import type { Invitation } from "@/domain/models/Invitation";
import type {
  IInvitationGateway,
  CreateInvitationInput,
} from "@/application/ports/IInvitationGateway";

export class CreateInvitation {
  constructor(private readonly invitations: IInvitationGateway) {}

  async execute(
    orgId: string,
    input: CreateInvitationInput,
  ): Promise<Invitation> {
    return this.invitations.createInvitation(orgId, input);
  }
}
