import { describe, it, expect, vi } from "vitest";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { AuthError } from "@/domain/errors/AuthError";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";

const user: User = {
  id: "u1",
  supabaseUid: "sb-u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  accountType: "personal",
  preferredLocale: "en",
  preferredCurrency: "USD",
  isVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
};

function makeGateway(overrides?: Partial<IAuthGateway>): IAuthGateway {
  return {
    getCurrentUser: vi.fn().mockResolvedValue(user),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("GetCurrentUser", () => {
  it("returns the current user", async () => {
    const gateway = makeGateway();
    const result = await new GetCurrentUser(gateway).execute();
    expect(result).toEqual(user);
    expect(gateway.getCurrentUser).toHaveBeenCalledOnce();
  });

  it("re-throws AuthError from gateway", async () => {
    const err = new AuthError("not authenticated", "UNAUTHENTICATED");
    const gateway = makeGateway({
      getCurrentUser: vi.fn().mockRejectedValue(err),
    });
    await expect(new GetCurrentUser(gateway).execute()).rejects.toThrow(err);
  });

  it("wraps unknown errors in AuthError", async () => {
    const gateway = makeGateway({
      getCurrentUser: vi.fn().mockRejectedValue(new Error("network")),
    });
    await expect(new GetCurrentUser(gateway).execute()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});
