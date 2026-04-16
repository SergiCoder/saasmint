import { describe, it, expect, vi } from "vitest";
import { CancelInvitation } from "@/application/use-cases/invitation/CancelInvitation";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

function makeGateway(
  overrides?: Partial<IInvitationGateway>,
): IInvitationGateway {
  return {
    createInvitation: vi.fn(),
    listInvitations: vi.fn(),
    cancelInvitation: vi.fn().mockResolvedValue(undefined),
    getByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    ...overrides,
  };
}

describe("CancelInvitation", () => {
  it("calls cancelInvitation with correct args", async () => {
    const gateway = makeGateway();
    await new CancelInvitation(gateway).execute("o1", "inv1");
    expect(gateway.cancelInvitation).toHaveBeenCalledWith("o1", "inv1");
  });
});
