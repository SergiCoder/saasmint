import { describe, it, expect, vi } from "vitest";
import { ListOrgMembers } from "@/application/use-cases/org-member/ListOrgMembers";
import type { IOrgMemberGateway } from "@/application/ports/IOrgMemberGateway";
import type { OrgMember } from "@/domain/models/OrgMember";

const members: OrgMember[] = [
  {
    id: "m1",
    user: {
      id: "u1",
      email: "alice@example.com",
      fullName: "Alice",
      avatarUrl: null,
    },
    org: "o1",
    role: "owner",
    isBilling: true,
    joinedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "m2",
    user: {
      id: "u2",
      email: "bob@example.com",
      fullName: "Bob",
      avatarUrl: null,
    },
    org: "o1",
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
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    leaveOrg: vi.fn(),
    transferOwnership: vi.fn(),
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
