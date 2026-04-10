import { describe, it, expect, vi } from "vitest";
import { CancelAccountDeletion } from "@/application/use-cases/auth/CancelAccountDeletion";
import type { IAuthGateway } from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";

function makeGateway(overrides?: Partial<IAuthGateway>): IAuthGateway {
  return {
    getCurrentUser: vi.fn(),
    signOut: vi.fn(),
    deleteAccount: vi.fn().mockResolvedValue({ scheduledDeletionAt: null }),
    cancelDeletion: vi.fn(),
    ...overrides,
  };
}

const fakeUser: User = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
  avatarUrl: null,
  accountType: "personal",
  preferredLocale: "en",
  preferredCurrency: "USD",
  phonePrefix: null,
  phone: null,
  timezone: null,
  jobTitle: null,
  pronouns: null,
  bio: null,
  isVerified: true,
  registrationMethod: "email",
  linkedProviders: [],
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  scheduledDeletionAt: null,
};

describe("CancelAccountDeletion", () => {
  it("calls cancelDeletion on the gateway and returns the user", async () => {
    const gateway = makeGateway({
      cancelDeletion: vi.fn().mockResolvedValue(fakeUser),
    });

    const result = await new CancelAccountDeletion(gateway).execute();

    expect(gateway.cancelDeletion).toHaveBeenCalledOnce();
    expect(result).toEqual(fakeUser);
  });

  it("propagates errors from the gateway", async () => {
    const err = new Error("network failure");
    const gateway = makeGateway({
      cancelDeletion: vi.fn().mockRejectedValue(err),
    });

    await expect(new CancelAccountDeletion(gateway).execute()).rejects.toThrow(
      "network failure",
    );
  });
});
