import type { Invitation } from "@/domain/models/Invitation";

export interface CreateInvitationInput {
  email: string;
  role: "admin" | "member";
}

export interface IInvitationGateway {
  createInvitation(
    orgId: string,
    input: CreateInvitationInput,
  ): Promise<Invitation>;
  listInvitations(orgId: string): Promise<Invitation[]>;
  cancelInvitation(orgId: string, invitationId: string): Promise<void>;
  getByToken(token: string): Promise<Invitation>;
  acceptInvitation(
    token: string,
    input: { fullName: string; password: string },
  ): Promise<{ accessToken: string; refreshToken: string }>;
  declineInvitation(token: string): Promise<void>;
}
