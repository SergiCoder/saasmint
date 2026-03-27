export interface OrgMember {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: "owner" | "admin" | "member";
  isBilling: boolean;
  joinedAt: string;
}
