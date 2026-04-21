import type { IOrgGateway } from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch } from "./apiClient";
import { keysToCamel } from "./caseTransform";
import { OrgSchema } from "./schemas";

function parseOrg(raw: Record<string, unknown>): Org {
  return OrgSchema.parse(keysToCamel(raw));
}

export class DjangoApiOrgGateway implements IOrgGateway {
  async listUserOrgs(): Promise<Org[]> {
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      "/orgs/",
    );
    return data.results.map(parseOrg);
  }
}
