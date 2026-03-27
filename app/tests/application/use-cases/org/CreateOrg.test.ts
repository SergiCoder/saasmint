import { describe, it, expect, vi } from "vitest";
import { CreateOrg } from "@/application/use-cases/org/CreateOrg";
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
    createOrg: vi.fn().mockResolvedValue(org),
    getOrg: vi.fn(),
    updateOrg: vi.fn(),
    listUserOrgs: vi.fn(),
    ...overrides,
  };
}

describe("CreateOrg", () => {
  it("creates and returns the org", async () => {
    const gateway = makeGateway();
    const input = { name: "Acme", slug: "acme" };
    const result = await new CreateOrg(gateway).execute(input);
    expect(result).toEqual(org);
    expect(gateway.createOrg).toHaveBeenCalledWith(input);
  });
});
