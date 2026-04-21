import type { Org } from "@/domain/models/Org";

export interface IOrgGateway {
  listUserOrgs(userId: string): Promise<Org[]>;
}
