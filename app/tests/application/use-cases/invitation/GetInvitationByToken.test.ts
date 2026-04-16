import { describe, it, expect, vi } from "vitest";
import { GetInvitationByToken } from "@/application/use-cases/invitation/GetInvitationByToken";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";
import type { Invitation } from "@/domain/models/Invitation";

const fakeInvitation: Invitation = {
  id: "inv1",
  org: "org-1",
  orgName: "The Bee Lab",
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
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    getByToken: vi.fn().mockResolvedValue(fakeInvitation),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    ...overrides,
  };
}

describe("GetInvitationByToken", () => {
  it("calls getByToken with correct token", async () => {
    const gateway = makeGateway();
    const result = await new GetInvitationByToken(gateway).execute("abc123");
    expect(gateway.getByToken).toHaveBeenCalledWith("abc123");
    expect(result.orgName).toBe("The Bee Lab");
  });
});
