import type {
  CreateInvitationInput,
  IInvitationGateway,
} from "@/application/ports/IInvitationGateway";
import type { Invitation, PublicInvitation } from "@/domain/models/Invitation";
import {
  apiFetch,
  apiFetchVoid,
  publicApiFetch,
  publicApiFetchVoid,
} from "./apiClient";
import {
  parseInvitation,
  parsePaginated,
  parsePublicInvitation,
} from "./parsers";

export class DjangoApiInvitationGateway implements IInvitationGateway {
  async createInvitation(
    orgId: string,
    input: CreateInvitationInput,
  ): Promise<Invitation> {
    const raw = await apiFetch<Record<string, unknown>>(
      `/orgs/${encodeURIComponent(orgId)}/invitations/`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    return parseInvitation(raw);
  }

  async listInvitations(orgId: string): Promise<Invitation[]> {
    const data = await apiFetch<Record<string, unknown>>(
      `/orgs/${encodeURIComponent(orgId)}/invitations/`,
    );
    return parsePaginated(data, parseInvitation);
  }

  async cancelInvitation(orgId: string, invitationId: string): Promise<void> {
    await apiFetchVoid(
      `/orgs/${encodeURIComponent(orgId)}/invitations/${encodeURIComponent(invitationId)}/`,
      { method: "DELETE" },
    );
  }

  async getByToken(token: string): Promise<PublicInvitation> {
    const raw = await publicApiFetch<Record<string, unknown>>(
      `/invitations/${encodeURIComponent(token)}/`,
    );
    return parsePublicInvitation(raw);
  }

  async acceptInvitation(
    token: string,
    input: { fullName: string; password: string },
  ): Promise<void> {
    // Backend creates the user as unverified and queues a verification
    // email — it deliberately does not issue session tokens here. The user
    // must click the verification link before they can sign in.
    await publicApiFetchVoid(
      `/invitations/${encodeURIComponent(token)}/accept/`,
      {
        method: "POST",
        body: JSON.stringify({
          full_name: input.fullName,
          password: input.password,
        }),
      },
    );
  }

  async declineInvitation(token: string): Promise<void> {
    await publicApiFetchVoid(
      `/invitations/${encodeURIComponent(token)}/decline/`,
      {
        method: "POST",
      },
    );
  }
}
