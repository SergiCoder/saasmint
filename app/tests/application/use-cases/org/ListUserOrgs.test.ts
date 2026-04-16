import { describe, it, expect, vi } from "vitest";
import { ListUserOrgs } from "@/application/use-cases/org/ListUserOrgs";
import type { IOrgGateway } from "@/application/ports/IOrgGateway";
import type { Org } from "@/domain/models/Org";

const orgs: Org[] = [
  {
    id: "o1",
    name: "Acme",
    slug: "acme",
    logoUrl: null,
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "o2",
    name: "Beta",
    slug: "beta",
    logoUrl: null,
    createdAt: "2024-02-01T00:00:00Z",
  },
];

function makeGateway(overrides?: Partial<IOrgGateway>): IOrgGateway {
  return {
    deleteOrg: vi.fn(),
    getOrg: vi.fn(),
    updateOrg: vi.fn(),
    listUserOrgs: vi.fn().mockResolvedValue(orgs),
    ...overrides,
  };
}

describe("ListUserOrgs", () => {
  it("returns all orgs for a user", async () => {
    const gateway = makeGateway();
    const result = await new ListUserOrgs(gateway).execute("u1");
    expect(result).toEqual(orgs);
    expect(gateway.listUserOrgs).toHaveBeenCalledWith("u1");
  });
});
