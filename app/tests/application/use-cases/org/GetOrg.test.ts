import { describe, it, expect, vi } from "vitest";
import { GetOrg } from "@/application/use-cases/org/GetOrg";
import type { IOrgGateway } from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";

const org: Org = {
  id: "o1",
  name: "Acme",
  slug: "acme",
  logoUrl: null,
  createdAt: "2024-01-01T00:00:00Z",
};

function makeGateway(overrides?: Partial<IOrgGateway>): IOrgGateway {
  return {
    createOrg: vi.fn(),
    getOrg: vi.fn().mockResolvedValue(org),
    updateOrg: vi.fn(),
    listUserOrgs: vi.fn(),
    ...overrides,
  };
}

describe("GetOrg", () => {
  it("returns the org", async () => {
    const gateway = makeGateway();
    const result = await new GetOrg(gateway).execute("o1");
    expect(result).toEqual(org);
    expect(gateway.getOrg).toHaveBeenCalledWith("o1");
  });
});
