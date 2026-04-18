import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();

vi.mock("next/headers", () => ({
  headers: () => Promise.resolve({ get: mockGet }),
}));

const { PATHNAME_HEADER, getPathname, getPathnameWithoutLocale } = await import(
  "@/lib/pathname"
);

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
