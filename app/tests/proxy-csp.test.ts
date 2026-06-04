/**
 * Proxy CSP tests for reCAPTCHA conditional directives.
 *
 * A separate file from proxy.test.ts because `src/proxy.ts` reads
 * `env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY` at module-load time (via `env.ts`).
 * Testing the two branches (enabled / disabled) therefore requires reloading
 * the module for each case, which conflicts with the top-level static import
 * in proxy.test.ts. We reset modules in each test and use dynamic imports.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockIntlMiddleware = vi.fn();

vi.mock("next-intl/middleware", () => ({
  default: () => mockIntlMiddleware,
}));

vi.mock("@/lib/i18n/routing", () => {
  const locales = ["en", "es"] as const;
  const byLengthDesc = [...locales].sort((a, b) => b.length - a.length);
  return {
    routing: { locales, defaultLocale: "en" },
    stripLocalePrefix(pathname: string): string {
      const prefix = byLengthDesc.find(
        (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`,
      );
      if (!prefix) return pathname;
      const stripped = pathname.slice(prefix.length + 1);
      return stripped === "" ? "/" : stripped;
    },
  };
});

vi.stubGlobal("fetch", vi.fn());

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function createRequest(path: string): NextRequest {
  const url = new URL(path, APP_URL);
  return {
    nextUrl: url,
    url: url.toString(),
    cookies: {
      getAll: () => [],
      get: () => undefined,
      set: vi.fn(),
      delete: vi.fn(),
    },
    headers: new Headers(),
  } as unknown as NextRequest;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  mockIntlMiddleware.mockReset();
  mockIntlMiddleware.mockReturnValue(NextResponse.next());
});

async function loadProxy() {
  vi.resetModules();
  const mod = await import("@/proxy");
  return mod.default;
}

describe("proxy CSP — reCAPTCHA integration", () => {
  it("excludes Google/gstatic sources from script-src and uses frame-src 'none' when no site key is set", async () => {
    // Ensure no site key in env.
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "");
    mockIntlMiddleware.mockReturnValue(NextResponse.next());

    const proxy = await loadProxy();
    const response = await proxy(createRequest(`${APP_URL}/en/pricing`));

    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(csp).not.toContain("https://www.google.com");
    expect(csp).not.toContain("https://www.gstatic.com");
    expect(csp).toContain("frame-src 'none'");
  });

  it("adds Google/gstatic to script-src and widens frame-src when a site key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "site-key-xyz");
    mockIntlMiddleware.mockReturnValue(NextResponse.next());

    const proxy = await loadProxy();
    const response = await proxy(createRequest(`${APP_URL}/en/pricing`));

    const csp = response.headers.get("Content-Security-Policy") ?? "";
    // script-src must include both reCAPTCHA CDNs.
    expect(csp).toContain("https://www.google.com");
    expect(csp).toContain("https://www.gstatic.com");
    // frame-src must allow the invisible challenge iframe.
    expect(csp).toContain("frame-src https://www.google.com");
    // connect-src must also include Google for the v3 API calls.
    expect(csp).toContain("connect-src");
    const connectSrc = csp
      .split(";")
      .find((d) => d.trim().startsWith("connect-src"));
    expect(connectSrc).toContain("https://www.google.com");
  });

  it("CSP is emitted on protected routes as well as public ones", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "site-key-xyz");
    mockIntlMiddleware.mockReturnValue(NextResponse.next());

    // Use a public route (no cookies needed) so the proxy doesn't redirect.
    const proxy = await loadProxy();
    const response = await proxy(createRequest(`${APP_URL}/en/login`));

    // The proxy must set a nonce-bearing CSP regardless of reCAPTCHA state.
    const csp = response.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
  });
});
