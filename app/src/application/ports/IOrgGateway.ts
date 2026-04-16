import type { Org } from "@/domain/models/Org";

export interface UpdateOrgInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
}

export interface IOrgGateway {
  getOrg(orgId: string): Promise<Org>;
  updateOrg(orgId: string, input: UpdateOrgInput): Promise<Org>;
  listUserOrgs(userId: string): Promise<Org[]>;
  deleteOrg(orgId: string): Promise<void>;
}
