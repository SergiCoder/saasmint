import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAccessToken = vi.fn<() => Promise<string | null>>();
const mockDecodeJwtPayload =
  vi.fn<(token: string) => Record<string, unknown> | null>();

vi.mock("@/infrastructure/auth/cookies", () => ({
  getAccessToken: () => mockGetAccessToken(),
}));

vi.mock("@/lib/jwtDecode", () => ({
  decodeJwtPayload: (token: string) => mockDecodeJwtPayload(token),
}));

const { getCurrentUserIdFromCookie } = await import("@/lib/jwt");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUserIdFromCookie", () => {
  it("returns null when no access token is present in the cookie", async () => {
    mockGetAccessToken.mockResolvedValue(null);

    const result = await getCurrentUserIdFromCookie();

    expect(result).toBeNull();
    expect(mockDecodeJwtPayload).not.toHaveBeenCalled();
  });

  it("returns the sub claim when the token is valid", async () => {
    mockGetAccessToken.mockResolvedValue("header.payload.sig");
    mockDecodeJwtPayload.mockReturnValue({ sub: "user-abc-123", exp: 99999 });

    const result = await getCurrentUserIdFromCookie();

    expect(mockDecodeJwtPayload).toHaveBeenCalledWith("header.payload.sig");
    expect(result).toBe("user-abc-123");
  });

  it("returns null when decodeJwtPayload returns null (malformed token)", async () => {
    mockGetAccessToken.mockResolvedValue("not.a.valid.token");
    mockDecodeJwtPayload.mockReturnValue(null);

    const result = await getCurrentUserIdFromCookie();

    expect(result).toBeNull();
  });

  it("returns null when the payload has no sub claim", async () => {
    mockGetAccessToken.mockResolvedValue("header.payload.sig");
    mockDecodeJwtPayload.mockReturnValue({ exp: 9999999 });

    const result = await getCurrentUserIdFromCookie();

    expect(result).toBeNull();
  });

  it("returns null when sub is not a string", async () => {
    mockGetAccessToken.mockResolvedValue("header.payload.sig");
    mockDecodeJwtPayload.mockReturnValue({ sub: 42 });

    const result = await getCurrentUserIdFromCookie();

    expect(result).toBeNull();
  });

  it("returns null when sub is null", async () => {
    mockGetAccessToken.mockResolvedValue("header.payload.sig");
    mockDecodeJwtPayload.mockReturnValue({ sub: null });

    const result = await getCurrentUserIdFromCookie();

    expect(result).toBeNull();
  });
});
