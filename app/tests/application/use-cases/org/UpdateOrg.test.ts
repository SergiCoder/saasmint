import { describe, it, expect, vi } from "vitest";
import { UpdateOrg } from "@/application/use-cases/org/UpdateOrg";
import type { IOrgGateway } from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";

const org: Org = {
  id: "o1",
  name: "Acme Corp",
  slug: "acme-corp",
  logoUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
};

function makeGateway(overrides?: Partial<IOrgGateway>): IOrgGateway {
  return {
    deleteOrg: vi.fn(),
    getOrg: vi.fn(),
    updateOrg: vi.fn().mockResolvedValue(org),
    listUserOrgs: vi.fn(),
    ...overrides,
  };
}

describe("UpdateOrg", () => {
  it("updates and returns the org", async () => {
    const gateway = makeGateway();
    const input = { name: "Acme Corp", slug: "acme-corp" };
    const result = await new UpdateOrg(gateway).execute("o1", input);
    expect(result).toEqual(org);
    expect(gateway.updateOrg).toHaveBeenCalledWith("o1", input);
  });
});
