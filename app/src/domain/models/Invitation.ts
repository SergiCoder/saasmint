export interface InvitedBy {
  id: string;
  email: string;
  fullName: string;
}

export interface Invitation {
  id: string;
  org: string;
  orgName: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "accepted" | "expired" | "cancelled";
  invitedBy: InvitedBy;
  createdAt: string;
  expiresAt: string;
}
