import type {
  CreateInvitationInput,
  IInvitationGateway,
} from "@/application/ports/IInvitationGateway";
import type { Invitation } from "@/domain/models/Invitation";
import { apiFetch, publicApiFetch } from "./apiClient";
import { keysToCamel } from "./caseTransform";

function mapInvitation(raw: Record<string, unknown>): Invitation {
  const invitation = keysToCamel<Invitation>(raw);
  if (raw.invited_by && typeof raw.invited_by === "object") {
    invitation.invitedBy = keysToCamel(
      raw.invited_by as Record<string, unknown>,
    );
  }
  return invitation;
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
    return mapInvitation(raw);
  }

  async listInvitations(orgId: string): Promise<Invitation[]> {
    const data = await apiFetch<Record<string, unknown>[]>(
      `/orgs/${orgId}/invitations/`,
    );
    return data.map(mapInvitation);
  }

  async cancelInvitation(orgId: string, invitationId: string): Promise<void> {
    await apiFetch<void>(`/orgs/${orgId}/invitations/${invitationId}/`, {
      method: "DELETE",
    });
  }

  async getByToken(token: string): Promise<Invitation> {
    const raw = await publicApiFetch<Record<string, unknown>>(
      `/invitations/${token}/`,
    );
    return mapInvitation(raw);
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
    await publicApiFetch<void>(`/invitations/${token}/decline/`, {
      method: "POST",
    });
  }
}
