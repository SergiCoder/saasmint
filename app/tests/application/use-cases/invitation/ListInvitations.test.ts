import { describe, it, expect, vi } from "vitest";
import { ListInvitations } from "@/application/use-cases/invitation/ListInvitations";
import type { IInvitationGateway } from "@/application/ports/IInvitationGateway";

function makeGateway(
  overrides?: Partial<IInvitationGateway>,
): IInvitationGateway {
  return {
    createInvitation: vi.fn(),
    listInvitations: vi.fn().mockResolvedValue([]),
    cancelInvitation: vi.fn(),
    getByToken: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    ...overrides,
  };
}

describe("ListInvitations", () => {
  it("calls listInvitations with correct orgId", async () => {
    const gateway = makeGateway();
    const result = await new ListInvitations(gateway).execute("o1");
    expect(gateway.listInvitations).toHaveBeenCalledWith("o1");
    expect(result).toEqual([]);
  });
});
