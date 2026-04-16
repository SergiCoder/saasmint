import { describe, it, expect, vi } from "vitest";
import { CreateInvitation } from "@/application/use-cases/invitation/CreateInvitation";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";
import type { Invitation } from "@/domain/models/Invitation";

const invitation: Invitation = {
  id: "inv1",
  org: "o1",
  orgName: "Test Org",
  email: "bob@example.com",
  role: "member",
  status: "pending",
  invitedBy: { id: "u1", email: "alice@example.com", fullName: "Alice" },
  createdAt: "2024-01-01T00:00:00Z",
  expiresAt: "2024-01-08T00:00:00Z",
};

function makeGateway(
  overrides?: Partial<IInvitationGateway>,
): IInvitationGateway {
  return {
    createInvitation: vi.fn().mockResolvedValue(invitation),
    listInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    getByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    ...overrides,
  };
}

describe("CreateInvitation", () => {
  it("calls createInvitation with correct args", async () => {
    const gateway = makeGateway();
    const result = await new CreateInvitation(gateway).execute("o1", {
      email: "bob@example.com",
      role: "member",
    });
    expect(gateway.createInvitation).toHaveBeenCalledWith("o1", {
      email: "bob@example.com",
      role: "member",
    });
    expect(result).toEqual(invitation);
  });
});
