import { describe, it, expect, vi } from "vitest";
import { TransferOwnership } from "@/application/use-cases/org-member/TransferOwnership";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    leaveOrg: vi.fn(),
    transferOwnership: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("TransferOwnership", () => {
  it("calls transferOwnership with correct args", async () => {
    const gateway = makeGateway();
    await new TransferOwnership(gateway).execute("o1", "u2");
    expect(gateway.transferOwnership).toHaveBeenCalledWith("o1", "u2");
  });
});
