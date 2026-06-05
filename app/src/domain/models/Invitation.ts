import type { Org } from "./Org";

export interface InvitedBy {
  readonly id: string;
  readonly fullName: string;
}

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "cancelled"
  | "declined";

export type InvitationRole = "admin" | "member";

export interface Invitation {
  readonly id: string;
  readonly org: Org;
  readonly email: string;
  readonly role: InvitationRole;
  readonly status: InvitationStatus;
  readonly invitedBy: InvitedBy;
  readonly createdAt: string;
  readonly expiresAt: string;
}

/**
 * Unauthenticated GET /invitations/{token}/ shape — no PII.
 *
 * The invitee email is dropped so a leaked token cannot enumerate addresses,
 * and the inviter is reduced to `fullName` (the inviter's email is also
 * stripped because it is not needed by the accept-page UX).
 */
export interface PublicInvitation {
  readonly id: string;
  readonly org: Org;
  readonly role: InvitationRole;
  readonly status: InvitationStatus;
  readonly invitedBy: InvitedBy;
  readonly createdAt: string;
  readonly expiresAt: string;
}
