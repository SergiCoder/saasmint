import type { Org } from "@/domain/models/Org";

export interface CreateOrgInput {
  name: string;
  slug: string;
}

export interface UpdateOrgInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
}

export interface IOrgGateway {
  createOrg(input: CreateOrgInput): Promise<Org>;
  getOrg(orgId: string): Promise<Org>;
  updateOrg(orgId: string, input: UpdateOrgInput): Promise<Org>;
  listUserOrgs(userId: string): Promise<Org[]>;
}
