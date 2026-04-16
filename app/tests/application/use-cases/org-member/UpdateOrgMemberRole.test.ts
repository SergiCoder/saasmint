import { describe, it, expect, vi } from "vitest";
import { UpdateOrgMemberRole } from "@/application/use-cases/org-member/UpdateOrgMemberRole";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn().mockResolvedValue(undefined),
    leaveOrg: vi.fn(),
    transferOwnership: vi.fn(),
    ...overrides,
  };
}

describe("UpdateOrgMemberRole", () => {
  it("calls updateMemberRole with correct args", async () => {
    const gateway = makeGateway();
    await new UpdateOrgMemberRole(gateway).execute("o1", "u2", "admin");
    expect(gateway.updateMemberRole).toHaveBeenCalledWith("o1", "u2", "admin");
  });
});
