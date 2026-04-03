import { describe, it, expect, vi } from "vitest";
import { GetUserProfile } from "@/application/use-cases/user/GetUserProfile";
import type { IUserGateway } from "@/application/ports/IUserGateway";
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
  phonePrefix: null,
  phone: null,
  timezone: null,
  jobTitle: null,
  pronouns: null,
  bio: null,
  isVerified: true,
  createdAt: "2024-01-01T00:00:00Z",
};

function makeGateway(overrides?: Partial<IUserGateway>): IUserGateway {
  return {
    getProfile: vi.fn().mockResolvedValue(user),
    updateProfile: vi.fn(),
    ...overrides,
  };
}

describe("GetUserProfile", () => {
  it("returns the user profile", async () => {
    const gateway = makeGateway();
    const result = await new GetUserProfile(gateway).execute("u1");
    expect(result).toEqual(user);
    expect(gateway.getProfile).toHaveBeenCalledWith("u1");
  });
});
