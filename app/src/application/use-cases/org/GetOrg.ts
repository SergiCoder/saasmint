import type { Org } from "@/domain/models/Org";
import type { IOrgGateway } from "@/application/ports/IOrgGateway";

export class GetOrg {
  constructor(private readonly orgs: IOrgGateway) {}

  async execute(orgId: string): Promise<Org> {
    return this.orgs.getOrg(orgId);
  }
}
