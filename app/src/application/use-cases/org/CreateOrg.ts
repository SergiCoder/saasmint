import type { Org } from "@/domain/models/Org";
import type {
  IOrgGateway,
  CreateOrgInput,
} from "@/application/ports/IOrgGateway";

export class CreateOrg {
  constructor(private readonly orgs: IOrgGateway) {}

  async execute(input: CreateOrgInput): Promise<Org> {
    return this.orgs.createOrg(input);
  }
}
