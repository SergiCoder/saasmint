import { describe, it, expect, vi } from "vitest";
import { DeleteAccount } from "@/application/use-cases/auth/DeleteAccount";
import { AuthError } from "@/domain/errors/AuthError";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";

function makeGateway(overrides?: Partial<IAuthGateway>): IAuthGateway {
  return {
    getCurrentUser: vi.fn(),
    signOut: vi.fn(),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("DeleteAccount", () => {
  it("calls deleteAccount on the gateway", async () => {
    const gateway = makeGateway();
    await new DeleteAccount(gateway).execute();
    expect(gateway.deleteAccount).toHaveBeenCalledOnce();
  });

  it("re-throws AuthError from gateway", async () => {
    const err = new AuthError("forbidden", "DELETE_ACCOUNT_FAILED");
    const gateway = makeGateway({
      deleteAccount: vi.fn().mockRejectedValue(err),
    });
    await expect(new DeleteAccount(gateway).execute()).rejects.toThrow(err);
  });

  it("wraps unknown errors in AuthError", async () => {
    const gateway = makeGateway({
      deleteAccount: vi.fn().mockRejectedValue(new Error("network")),
    });
    await expect(new DeleteAccount(gateway).execute()).rejects.toMatchObject({
      code: "DELETE_ACCOUNT_FAILED",
    });
  });
});
