import { describe, it, expect, vi } from "vitest";
import { UpdateUserProfile } from "@/application/use-cases/user/UpdateUserProfile";
import type { IUserGateway } from "@/application/ports/IUserGateway";
import type { User } from "@/domain/models/User";

const user: User = {
  id: "u1",
  supabaseUid: "sb-u1",
  email: "alice@example.com",
  fullName: "Alice Updated",
  avatarUrl: null,
  accountType: "personal",
  preferredLocale: "fr",
  preferredCurrency: "EUR",
  isVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
};

function makeGateway(overrides?: Partial<IUserGateway>): IUserGateway {
  return {
    getProfile: vi.fn(),
    updateProfile: vi.fn().mockResolvedValue(user),
    ...overrides,
  };
}

describe("UpdateUserProfile", () => {
  it("delegates to gateway with correct args and returns updated user", async () => {
    const gateway = makeGateway();
    const input = {
      fullName: "Alice Updated",
      preferredLocale: "fr",
      preferredCurrency: "EUR",
    };
    const result = await new UpdateUserProfile(gateway).execute("u1", input);
    expect(result).toEqual(user);
    expect(gateway.updateProfile).toHaveBeenCalledWith("u1", input);
  });
});
