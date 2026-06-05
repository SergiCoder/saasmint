import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: mockGet }),
}));

const { PATHNAME_HEADER, getPathname, getPathnameWithoutLocale, getLocale } =
  await import("@/lib/pathname");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATHNAME_HEADER", () => {
  it("exposes the expected header name", () => {
    expect(PATHNAME_HEADER).toBe("x-pathname");
  });
});

describe("getPathname", () => {
  it("returns the pathname from the x-pathname request header", async () => {
    mockGet.mockImplementation((name: string) =>
      name === "x-pathname" ? "/en/dashboard" : null,
    );
    await expect(getPathname()).resolves.toBe("/en/dashboard");
    expect(mockGet).toHaveBeenCalledWith("x-pathname");
  });

  it("returns '/' when the header is missing", async () => {
    mockGet.mockReturnValue(null);
    await expect(getPathname()).resolves.toBe("/");
  });
});

describe("getPathnameWithoutLocale", () => {
  it("strips a simple locale prefix", async () => {
    mockGet.mockReturnValue("/en/dashboard");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/dashboard");
  });

  it("returns '/' when the pathname is exactly the locale root", async () => {
    mockGet.mockReturnValue("/es");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/");
  });

  it("returns '/' for the locale root with trailing slash", async () => {
    mockGet.mockReturnValue("/en/");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/");
  });

  it("strips a multi-part locale prefix (longest match wins)", async () => {
    mockGet.mockReturnValue("/pt-BR/profile/settings");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/profile/settings");
  });

  it("keeps pathname intact when no locale matches", async () => {
    mockGet.mockReturnValue("/api/health");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/api/health");
  });

  it("does not strip a prefix that merely starts with a locale string", async () => {
    // "/english/..." should NOT be treated as having the "en" locale.
    mockGet.mockReturnValue("/english/about");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/english/about");
  });

  it("returns '/' when the header is missing", async () => {
    mockGet.mockReturnValue(null);
    await expect(getPathnameWithoutLocale()).resolves.toBe("/");
  });

  it("handles hyphenated locale code at the root", async () => {
    mockGet.mockReturnValue("/zh-CN");
    await expect(getPathnameWithoutLocale()).resolves.toBe("/");
  });
});

describe("getLocale", () => {
  it("returns the locale from a prefixed pathname", async () => {
    mockGet.mockReturnValue("/es/dashboard");
    await expect(getLocale()).resolves.toBe("es");
  });

  it("falls back to the default locale when the header returns an empty string", async () => {
    // An empty-string header value makes getPathname() return "" (not the "/"
    // fallback), so pathname.split("/")[1] is undefined — the ?? "" guard
    // kicks in and isLocale("") is false, so we fall back to defaultLocale.
    mockGet.mockImplementation((name: string) =>
      name === "x-pathname" ? "" : null,
    );
    await expect(getLocale()).resolves.toBe("en");
  });

  it("returns hyphenated locales correctly", async () => {
    mockGet.mockReturnValue("/pt-BR/profile");
    await expect(getLocale()).resolves.toBe("pt-BR");
  });

  it("falls back to the default locale when the pathname has no locale prefix", async () => {
    mockGet.mockReturnValue("/dashboard");
    await expect(getLocale()).resolves.toBe("en");
  });

  it("falls back to the default locale when the pathname is the root", async () => {
    mockGet.mockReturnValue("/");
    await expect(getLocale()).resolves.toBe("en");
  });

  it("falls back to the default locale when the header is missing", async () => {
    mockGet.mockReturnValue(null);
    await expect(getLocale()).resolves.toBe("en");
  });

  it("falls back to the default locale on an unknown first segment", async () => {
    mockGet.mockReturnValue("/english/about");
    await expect(getLocale()).resolves.toBe("en");
  });
});
