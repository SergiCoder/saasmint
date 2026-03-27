import { describe, it, expect, vi } from "vitest";
import { InviteOrgMember } from "@/application/use-cases/org-member/InviteOrgMember";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn(),
    inviteMember: vi.fn().mockResolvedValue(undefined),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    ...overrides,
  };
}

describe("InviteOrgMember", () => {
  it("calls inviteMember with correct args", async () => {
    const gateway = makeGateway();
    await new InviteOrgMember(gateway).execute(
      "o1",
      "carol@example.com",
      "admin",
    );
    expect(gateway.inviteMember).toHaveBeenCalledWith(
      "o1",
      "carol@example.com",
      "admin",
    );
  });
});
