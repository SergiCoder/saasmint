import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";
import { NetworkError } from "@/domain/errors/NetworkError";
import { ApiError } from "@/domain/errors/ApiError";

const mockGetCurrentUser = vi.fn();
const mockRedirect = vi.fn((_dest: string): never => {
  // Real `next/navigation` redirect throws NEXT_REDIRECT to unwind the
  // server render; mirror that so the try/catch in the loader doesn't
  // swallow control flow and accidentally "return" from a redirect branch.
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/infrastructure/registry", () => ({
  authGateway: { getCurrentUser: () => mockGetCurrentUser() },
}));

vi.mock("next/navigation", () => ({
  redirect: (dest: string) => mockRedirect(dest),
}));

// Loader reads the active locale from the middleware-forwarded `x-pathname` header;
// stub a fixed locale so redirects assert against the locale-prefixed path
// (the locale-prefixed-redirect rule documented in CLAUDE.md).
vi.mock("@/lib/pathname", () => ({
  getLocale: vi.fn(() => Promise.resolve("en")),
}));

const { getCurrentUser } = await import("@/app/[locale]/_data/getCurrentUser");

const fakeUser = {
  id: "u1",
  email: "alice@example.com",
  fullName: "Alice",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCurrentUser", () => {
  it("returns the gateway's User on success", async () => {
    mockGetCurrentUser.mockResolvedValue(fakeUser);

    await expect(getCurrentUser()).resolves.toEqual(fakeUser);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /login?error=<auth-code> when gateway throws AuthError", async () => {
    mockGetCurrentUser.mockRejectedValue(
      new AuthError("expired", "TOKEN_EXPIRED"),
    );

    await expect(getCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/en/login?error=TOKEN_EXPIRED");
  });

  it("coerces non-auth errors to /login?error=UNAUTHENTICATED so a probe failure never surfaces a 500", async () => {
    mockGetCurrentUser.mockRejectedValue(
      new NetworkError("core API unreachable"),
    );

    await expect(getCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/en/login?error=UNAUTHENTICATED",
    );
  });

  it("treats an ApiError the same as a generic failure (UNAUTHENTICATED)", async () => {
    mockGetCurrentUser.mockRejectedValue(new ApiError(500, { detail: "boom" }));

    await expect(getCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/en/login?error=UNAUTHENTICATED",
    );
  });

  it("treats a bare thrown value (non-Error) as UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockRejectedValue("weird string");

    await expect(getCurrentUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/en/login?error=UNAUTHENTICATED",
    );
  });
});
