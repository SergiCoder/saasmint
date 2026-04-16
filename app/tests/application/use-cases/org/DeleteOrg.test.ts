import { describe, it, expect, vi } from "vitest";
import { DeleteOrg } from "@/application/use-cases/org/DeleteOrg";
import type { IOrgGateway } from "@/application/ports/IOrgGateway";

function makeGateway(overrides?: Partial<IOrgGateway>): IOrgGateway {
  return {
    getOrg: vi.fn(),
    updateOrg: vi.fn(),
    listUserOrgs: vi.fn(),
    deleteOrg: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DeleteOrg", () => {
  it("calls deleteOrg with correct orgId", async () => {
    const gateway = makeGateway();
    await new DeleteOrg(gateway).execute("o1");
    expect(gateway.deleteOrg).toHaveBeenCalledWith("o1");
  });
});
