import { describe, it, expect, vi } from "vitest";
import { AddOrgMember } from "@/application/use-cases/org-member/InviteOrgMember";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn(),
    addMember: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    ...overrides,
  };
}

describe("AddOrgMember", () => {
  it("calls addMember with correct args", async () => {
    const gateway = makeGateway();
    await new AddOrgMember(gateway).execute("o1", "user-uuid", "admin");
    expect(gateway.addMember).toHaveBeenCalledWith("o1", "user-uuid", "admin");
  });
});
