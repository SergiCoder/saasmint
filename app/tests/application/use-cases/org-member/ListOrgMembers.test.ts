import { describe, it, expect, vi } from "vitest";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";

const members: OrgMember[] = [
  {
    id: "m1",
    userId: "u1",
    email: "alice@example.com",
    fullName: "Alice",
    role: "owner",
    isBilling: true,
    joinedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "m2",
    userId: "u2",
    email: "bob@example.com",
    fullName: "Bob",
    role: "member",
    isBilling: false,
    joinedAt: "2024-02-01T00:00:00Z",
  },
];

function makeGateway(
  overrides?: Partial<IOrgMemberGateway>,
): IOrgMemberGateway {
  return {
    listMembers: vi.fn().mockResolvedValue(members),
    inviteMember: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    ...overrides,
  };
}

describe("ListOrgMembers", () => {
  it("returns all members for the org", async () => {
    const gateway = makeGateway();
    const result = await new ListOrgMembers(gateway).execute("o1");
    expect(result).toEqual(members);
    expect(gateway.listMembers).toHaveBeenCalledWith("o1");
  });
});
