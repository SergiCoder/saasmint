import { describe, it, expect, vi } from "vitest";
import { LeaveOrg } from "@/application/use-cases/org-member/LeaveOrg";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    leaveOrg: vi.fn().mockResolvedValue(undefined),
    transferOwnership: vi.fn(),
    ...overrides,
  };
}

describe("LeaveOrg", () => {
  it("calls leaveOrg with correct orgId", async () => {
    const gateway = makeGateway();
    await new LeaveOrg(gateway).execute("o1");
    expect(gateway.leaveOrg).toHaveBeenCalledWith("o1");
  });
});
