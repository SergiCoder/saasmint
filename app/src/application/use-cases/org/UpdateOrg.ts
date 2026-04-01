import type { Org } from "@/domain/models/Org";
import type {
  IOrgGateway,
  UpdateOrgInput,
} from "@/application/ports/IOrgGateway";

export class UpdateOrg {
  constructor(private readonly orgs: IOrgGateway) {}

  async execute(orgId: string, input: UpdateOrgInput): Promise<Org> {
    return this.orgs.updateOrg(orgId, input);
  }
}
