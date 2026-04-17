import { describe, it, expect, afterEach, vi } from "vitest";

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;
const ORIGINAL_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL;
  process.env.NEXT_PUBLIC_APP_URL = ORIGINAL_APP_URL;
  vi.resetModules();
});

describe("env", () => {
  it("exposes validated NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_URL", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    vi.resetModules();

    const { env } = await import("@/lib/env");
    expect(env.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://app.example.com");
  });

  it("throws when NEXT_PUBLIC_API_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    vi.resetModules();

    await expect(import("@/lib/env")).rejects.toThrow(
      /Missing environment variable: NEXT_PUBLIC_API_URL/,
    );
  });

  it("throws when NEXT_PUBLIC_APP_URL is missing", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";
    delete process.env.NEXT_PUBLIC_APP_URL;
    vi.resetModules();

    await expect(import("@/lib/env")).rejects.toThrow(
      /Missing environment variable: NEXT_PUBLIC_APP_URL/,
    );
  });

  it("throws when an env var is not a valid URL", async () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    vi.resetModules();

    await expect(import("@/lib/env")).rejects.toThrow(
      /Invalid URL in environment variable NEXT_PUBLIC_API_URL/,
    );
  });
});
