import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      set: mockSet,
      delete: mockDelete,
      get: mockGet,
    }),
}));

const { setAuthCookies, clearAuthCookies, getAccessToken, getRefreshToken } =
  await import("@/infrastructure/auth/cookies");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setAuthCookies", () => {
  it("sets both access and refresh token cookies", async () => {
    await setAuthCookies("access_abc", "refresh_xyz");

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      "access_token",
      "access_abc",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      "refresh_token",
      "refresh_xyz",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }),
    );
  });

  it("sets access_token maxAge to 15 minutes", async () => {
    await setAuthCookies("a", "r");

    const accessCall = mockSet.mock.calls.find(
      (call: unknown[]) => call[0] === "access_token",
    );
    expect(accessCall?.[2]).toMatchObject({ maxAge: 15 * 60 });
  });
});

describe("clearAuthCookies", () => {
  it("deletes both cookies", async () => {
    await clearAuthCookies();

    expect(mockDelete).toHaveBeenCalledWith("access_token");
    expect(mockDelete).toHaveBeenCalledWith("refresh_token");
  });
});

describe("getAccessToken", () => {
  it("returns the access token value when present", async () => {
    mockGet.mockReturnValue({ value: "access_abc" });

    const result = await getAccessToken();

    expect(mockGet).toHaveBeenCalledWith("access_token");
    expect(result).toBe("access_abc");
  });

  it("returns undefined when no access token cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await getAccessToken();

    expect(result).toBeUndefined();
  });
});

describe("getRefreshToken", () => {
  it("returns the refresh token value when present", async () => {
    mockGet.mockReturnValue({ value: "refresh_xyz" });

    const result = await getRefreshToken();

    expect(mockGet).toHaveBeenCalledWith("refresh_token");
    expect(result).toBe("refresh_xyz");
  });

  it("returns undefined when no refresh token cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await getRefreshToken();

    expect(result).toBeUndefined();
  });
});
