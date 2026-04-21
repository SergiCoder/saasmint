import { describe, it, expect, vi } from "vitest";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { AuthError } from "@/domain/errors/AuthError";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";

function makeGateway(overrides?: Partial<IAuthGateway>): IAuthGateway {
  return {
    getCurrentUser: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn(),
    ...overrides,
  };
}

describe("SignOut", () => {
  it("calls signOut on the gateway", async () => {
    const gateway = makeGateway();
    await new SignOut(gateway).execute();
    expect(gateway.signOut).toHaveBeenCalledOnce();
  });

  it("re-throws AuthError from gateway", async () => {
    const err = new AuthError("sign out failed", "SIGN_OUT_FAILED");
    const gateway = makeGateway({ signOut: vi.fn().mockRejectedValue(err) });
    await expect(new SignOut(gateway).execute()).rejects.toThrow(err);
  });

  it("wraps unknown errors in AuthError", async () => {
    const gateway = makeGateway({
      signOut: vi.fn().mockRejectedValue(new Error("network")),
    });
    await expect(new SignOut(gateway).execute()).rejects.toMatchObject({
      code: "SIGN_OUT_FAILED",
    });
  });
});
