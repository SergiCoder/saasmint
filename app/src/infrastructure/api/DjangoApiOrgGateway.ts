import type {
  IOrgGateway,
  UpdateOrgInput,
} from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";
import { apiFetch } from "./apiClient";
import { keysToCamel, keysToSnake } from "./caseTransform";
import { OrgSchema } from "./schemas";

function parseOrg(raw: Record<string, unknown>): Org {
  return OrgSchema.parse(keysToCamel(raw));
}

export class DjangoApiOrgGateway implements IOrgGateway {
  async getOrg(orgId: string): Promise<Org> {
    const raw = await apiFetch<Record<string, unknown>>(`/orgs/${orgId}/`);
    return parseOrg(raw);
  }

  async updateOrg(orgId: string, input: UpdateOrgInput): Promise<Org> {
    const raw = await apiFetch<Record<string, unknown>>(`/orgs/${orgId}/`, {
      method: "PATCH",
      body: JSON.stringify(keysToSnake(input)),
    });
    return parseOrg(raw);
  }

  async listUserOrgs(_userId: string): Promise<Org[]> {
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      "/orgs/",
    );
    return data.results.map(parseOrg);
  }
}
