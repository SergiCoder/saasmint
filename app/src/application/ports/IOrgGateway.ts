import type { Org } from "@/domain/models/Org";

export interface IOrgGateway {
  listUserOrgs(): Promise<Org[]>;
  deleteOrg(orgId: string): Promise<void>;
}
