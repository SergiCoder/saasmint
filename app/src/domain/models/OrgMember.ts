import type { Org } from "./Org";

export interface OrgMemberUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
}

export interface OrgMember {
  readonly id: string;
  readonly org: Org;
  readonly user: OrgMemberUser;
  readonly role: "owner" | "admin" | "member";
  readonly isBilling: boolean;
  readonly joinedAt: string;
}
