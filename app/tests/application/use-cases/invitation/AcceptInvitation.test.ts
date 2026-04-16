import { describe, it, expect, vi } from "vitest";
import { AcceptInvitation } from "@/application/use-cases/invitation/AcceptInvitation";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

function makeGateway(
  overrides?: Partial<IInvitationGateway>,
): IInvitationGateway {
  return {
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    getByToken: vi.fn(),
    acceptInvitation: vi
      .fn()
      .mockResolvedValue({ accessToken: "at", refreshToken: "rt" }),
    declineInvitation: vi.fn(),
    ...overrides,
  };
}

describe("AcceptInvitation", () => {
  it("calls acceptInvitation with correct token and input", async () => {
    const gateway = makeGateway();
    const input = { fullName: "Bob Smith", password: "secret123" };
    await new AcceptInvitation(gateway).execute("abc123", input);
    expect(gateway.acceptInvitation).toHaveBeenCalledWith("abc123", input);
  });
});
