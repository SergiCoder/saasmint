export interface OrgMemberUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

export interface OrgMember {
  id: string;
  org: string;
  user: OrgMemberUser;
  role: "owner" | "admin" | "member";
  isBilling: boolean;
  joinedAt: string;
}
