import { describe, it, expect, vi } from "vitest";
import { RemoveOrgMember } from "@/application/use-cases/org-member/RemoveOrgMember";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn().mockResolvedValue(undefined),
    updateMemberRole: vi.fn(),
    ...overrides,
  };
}

describe("RemoveOrgMember", () => {
  it("calls removeMember with correct args", async () => {
    const gateway = makeGateway();
    await new RemoveOrgMember(gateway).execute("o1", "u2");
    expect(gateway.removeMember).toHaveBeenCalledWith("o1", "u2");
  });
});
