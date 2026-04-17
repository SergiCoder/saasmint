export interface OrgMemberUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
}

export interface OrgMember {
  readonly id: string;
  readonly org: string;
  readonly user: OrgMemberUser;
  readonly role: "owner" | "admin" | "member";
  readonly isBilling: boolean;
  readonly joinedAt: string;
}
