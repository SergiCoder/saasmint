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
import { keysToCamel } from "./caseTransform";
import { InvitationSchema, PublicInvitationSchema } from "./schemas";

function parseInvitation(raw: Record<string, unknown>): Invitation {
  return InvitationSchema.parse(keysToCamel(raw));
}

function parsePublicInvitation(raw: Record<string, unknown>): PublicInvitation {
  return PublicInvitationSchema.parse(keysToCamel(raw));
}

export class DjangoApiInvitationGateway implements IInvitationGateway {
  async createInvitation(
    orgId: string,
    input: CreateInvitationInput,
  ): Promise<Invitation> {
    const raw = await apiFetch<Record<string, unknown>>(
      `/orgs/${orgId}/invitations/`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
    return parseInvitation(raw);
  }

  async listInvitations(orgId: string): Promise<Invitation[]> {
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      `/orgs/${orgId}/invitations/`,
    );
    return data.results.map(parseInvitation);
  }

  async cancelInvitation(orgId: string, invitationId: string): Promise<void> {
    await apiFetchVoid(`/orgs/${orgId}/invitations/${invitationId}/`, {
      method: "DELETE",
    });
  }

  async getByToken(token: string): Promise<PublicInvitation> {
    const raw = await publicApiFetch<Record<string, unknown>>(
      `/invitations/${token}/`,
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
    await publicApiFetchVoid(`/invitations/${token}/accept/`, {
      method: "POST",
      body: JSON.stringify({
        full_name: input.fullName,
        password: input.password,
      }),
    });
  }

  async declineInvitation(token: string): Promise<void> {
    await publicApiFetchVoid(`/invitations/${token}/decline/`, {
      method: "POST",
    });
  }
}
