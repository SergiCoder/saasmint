import { describe, it, expect, vi } from "vitest";
import { DeclineInvitation } from "@/application/use-cases/invitation/DeclineInvitation";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

function makeGateway(
  overrides?: Partial<IInvitationGateway>,
): IInvitationGateway {
  return {
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    cancelInvitation: vi.fn(),
    getByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DeclineInvitation", () => {
  it("calls declineInvitation with correct token", async () => {
    const gateway = makeGateway();
    await new DeclineInvitation(gateway).execute("abc123");
    expect(gateway.declineInvitation).toHaveBeenCalledWith("abc123");
  });
});
