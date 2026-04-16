import type { IOrgGateway } from "@/application/ports/IOrgGateway";

export class DeleteOrg {
  constructor(private readonly orgs: IOrgGateway) {}

  async execute(orgId: string): Promise<void> {
    return this.orgs.deleteOrg(orgId);
  }
}
