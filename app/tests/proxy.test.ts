import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockIntlMiddleware = vi.fn();

vi.mock("next-intl/middleware", () => ({
  default: () => mockIntlMiddleware,
}));

vi.mock("@/lib/i18n/routing", () => ({
  routing: {
    locales: ["en", "es", "pt-BR"],
    defaultLocale: "en",
  },
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Stub env vars required by createServerClient
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

const { proxy } = await import("@/proxy");

function createMockRequest(
  url: string,
  cookies: { name: string; value: string }[] = [],
): NextRequest {
  const parsedUrl = new URL(url, "http://localhost:3000");
  return {
    nextUrl: parsedUrl,
    url: parsedUrl.toString(),
    cookies: {
      getAll: () => cookies,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIntlMiddleware.mockReturnValue(NextResponse.next());
});

describe("proxy", () => {
  describe("auth code redirect", () => {
    it("redirects root with ?code= to auth callback", async () => {
      const request = createMockRequest("http://localhost:3000/en?code=abc123");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/en/auth/callback?code=abc123");
    });

    it("redirects locale root with ?code= to auth callback", async () => {
      const request = createMockRequest("http://localhost:3000/es?code=xyz");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/es/auth/callback?code=xyz");
    });

    it("does not redirect non-root paths with ?code=", async () => {
      const request = createMockRequest(
        "http://localhost:3000/en/pricing?code=abc",
      );
      const response = await proxy(request);

      const location = response.headers.get("location");
      expect(location).toBeNull();
    });
  });

  describe("protected routes", () => {
    it("redirects unauthenticated user to login on /dashboard", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest("http://localhost:3000/en/dashboard");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/en/login");
    });

    it("redirects unauthenticated user to login on /billing", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest("http://localhost:3000/en/billing");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("redirects unauthenticated user to login on /settings", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest("http://localhost:3000/en/settings");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("redirects unauthenticated user to login on /org", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest("http://localhost:3000/en/org");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("redirects unauthenticated user to login on /admin", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest("http://localhost:3000/en/admin");
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("allows authenticated user through protected route", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "u1" } },
      });

      const request = createMockRequest("http://localhost:3000/en/dashboard");
      const response = await proxy(request);

      // Should not redirect to login
      const location = response.headers.get("location");
      expect(location).toBeNull();
    });

    it("preserves locale when redirecting to login", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest("http://localhost:3000/es/dashboard");
      const response = await proxy(request);

      expect(response.headers.get("location")).toContain("/es/login");
    });
  });

  describe("public routes", () => {
    it("passes public routes through intl middleware", async () => {
      const request = createMockRequest("http://localhost:3000/en/pricing");
      await proxy(request);

      // Should not call getUser for public routes
      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it("does not require auth for marketing pages", async () => {
      const request = createMockRequest("http://localhost:3000/en/about");
      const response = await proxy(request);

      const location = response.headers.get("location");
      expect(location).toBeNull();
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe("locale handling in protected paths", () => {
    it("handles pt-BR locale prefix correctly", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const request = createMockRequest(
        "http://localhost:3000/pt-BR/dashboard",
      );
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pt-BR/login");
    });
  });

  describe("config", () => {
    it("exports a matcher config", async () => {
      const { config } = await import("@/proxy");
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
    });
  });
});
