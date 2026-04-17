export interface InvitedBy {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
}

export interface Invitation {
  readonly id: string;
  readonly org: string;
  readonly orgName: string;
  readonly email: string;
  readonly role: "admin" | "member";
  readonly status:
    | "pending"
    | "accepted"
    | "expired"
    | "cancelled"
    | "declined";
  readonly invitedBy: InvitedBy;
  readonly createdAt: string;
  readonly expiresAt: string;
}
