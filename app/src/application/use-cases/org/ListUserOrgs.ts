import type { Org } from "@/domain/models/Org";
import type { IOrgGateway } from "@/application/ports/IOrgGateway";

export class ListUserOrgs {
  constructor(private readonly orgs: IOrgGateway) {}

  async execute(userId: string): Promise<Org[]> {
    return this.orgs.listUserOrgs(userId);
  }
}
