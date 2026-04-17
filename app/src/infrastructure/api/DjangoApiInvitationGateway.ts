import type {
  CreateInvitationInput,
  IInvitationGateway,
} from "@/application/ports/IInvitationGateway";
import type { Invitation } from "@/domain/models/Invitation";
import {
  apiFetch,
  apiFetchVoid,
  publicApiFetch,
  publicApiFetchVoid,
} from "./apiClient";
import { keysToCamel } from "./caseTransform";
import { InvitationSchema } from "./schemas";

function parseInvitation(raw: Record<string, unknown>): Invitation {
  return InvitationSchema.parse(keysToCamel(raw));
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

  async getByToken(token: string): Promise<Invitation> {
    const raw = await publicApiFetch<Record<string, unknown>>(
      `/invitations/${token}/`,
    );
    return parseInvitation(raw);
  }

  async acceptInvitation(
    token: string,
    input: { fullName: string; password: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const data = await publicApiFetch<{
      access_token: string;
      refresh_token: string;
    }>(`/invitations/${token}/accept/`, {
      method: "POST",
      body: JSON.stringify({
        full_name: input.fullName,
        password: input.password,
      }),
    });
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  async declineInvitation(token: string): Promise<void> {
    await publicApiFetchVoid(`/invitations/${token}/decline/`, {
      method: "POST",
    });
  }
}
