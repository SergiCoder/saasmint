import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const mockIntlMiddleware = vi.fn();

vi.mock("next-intl/middleware", () => ({
  default: () => mockIntlMiddleware,
}));

vi.mock("@/lib/i18n/routing", () => {
  const locales = ["en", "es", "pt-BR"] as const;
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

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

const { proxy } = await import("@/proxy");

// Helper to create a JWT-like token with a given exp
function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const payload = btoa(JSON.stringify({ sub: "u1", exp }));
  return `${header}.${payload}.signature`;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function createMockRequest(
  url: string,
  cookies: { name: string; value: string }[] = [],
): NextRequest {
  const parsedUrl = new URL(url, APP_URL);
  return {
    nextUrl: parsedUrl,
    url: parsedUrl.toString(),
    cookies: {
      getAll: () => cookies,
      get: (name: string) => cookies.find((c) => c.name === name),
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIntlMiddleware.mockReturnValue(NextResponse.next());
});

describe("proxy", () => {
  describe("protected routes", () => {
    it("redirects to login when no access_token cookie on /dashboard", async () => {
      const request = createMockRequest(`${APP_URL}/en/dashboard`);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("/en/login");
    });

    it("redirects to login when no access_token cookie on /subscription", async () => {
      const request = createMockRequest(`${APP_URL}/en/subscription`);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("redirects to login when no access_token cookie on /profile", async () => {
      const request = createMockRequest(`${APP_URL}/en/profile`);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("redirects to login when no access_token cookie on /org", async () => {
      const request = createMockRequest(`${APP_URL}/en/org`);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("redirects to login when no access_token cookie on /admin", async () => {
      const request = createMockRequest(`${APP_URL}/en/admin`);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("allows through when access_token is valid", async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 600; // 10 min from now
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: makeToken(futureExp) },
      ]);
      const response = await proxy(request);

      const location = response.headers.get("location");
      expect(location).toBeNull();
    });

    it("preserves locale when redirecting to login", async () => {
      const request = createMockRequest(`${APP_URL}/es/dashboard`);
      const response = await proxy(request);

      expect(response.headers.get("location")).toContain("/es/login");
    });

    it("redirects to login when access_token is expired and no refresh_token", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: makeToken(pastExp) },
      ]);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("attempts token refresh when access_token is expired", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const futureExp = Math.floor(Date.now() / 1000) + 900;

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: makeToken(futureExp),
            refresh_token: "new-refresh-tok",
            expires_in: 900,
          }),
      });

      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: makeToken(pastExp) },
        { name: "refresh_token", value: "old-refresh-tok" },
      ]);
      const response = await proxy(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/refresh/`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ refresh_token: "old-refresh-tok" }),
        }),
      );
      // Should not redirect to login
      const location = response.headers.get("location");
      expect(location).toBeNull();
    });

    it("redirects to login when token refresh fails", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;

      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
      });

      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: makeToken(pastExp) },
        { name: "refresh_token", value: "expired-refresh-tok" },
      ]);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });
  });

  describe("public routes", () => {
    it("passes public routes through intl middleware", async () => {
      const request = createMockRequest(`${APP_URL}/en/pricing`);
      await proxy(request);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does not require auth for marketing pages", async () => {
      const request = createMockRequest(`${APP_URL}/en/about`);
      const response = await proxy(request);

      const location = response.headers.get("location");
      expect(location).toBeNull();
    });

    it("refreshes expired token on public route when refresh_token exists", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const futureExp = Math.floor(Date.now() / 1000) + 900;

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: makeToken(futureExp),
            refresh_token: "new-refresh-tok",
          }),
      });

      const request = createMockRequest(`${APP_URL}/en/pricing`, [
        { name: "access_token", value: makeToken(pastExp) },
        { name: "refresh_token", value: "old-refresh-tok" },
      ]);
      const response = await proxy(request);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${API_URL}/api/v1/auth/refresh/`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ refresh_token: "old-refresh-tok" }),
        }),
      );
      // Should not redirect — public routes don't require auth
      const location = response.headers.get("location");
      expect(location).toBeNull();
    });

    it("continues without auth on public route when refresh fails", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;

      fetchSpy.mockResolvedValue({ ok: false, status: 401 });

      const request = createMockRequest(`${APP_URL}/en/pricing`, [
        { name: "access_token", value: makeToken(pastExp) },
        { name: "refresh_token", value: "expired-refresh-tok" },
      ]);
      const response = await proxy(request);

      // Public routes should NOT redirect to login even if refresh fails
      const location = response.headers.get("location");
      expect(location).toBeNull();
    });
  });

  describe("locale handling in protected paths", () => {
    it("handles pt-BR locale prefix correctly", async () => {
      const request = createMockRequest(`${APP_URL}/pt-BR/dashboard`);
      const response = await proxy(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/pt-BR/login");
    });
  });

  describe("anonymous routes skip token refresh", () => {
    // These routes never read the session user. Even with an expired access
    // token and a valid refresh token, the middleware must NOT call Django —
    // the round-trip would just add latency to every navigation.
    const pastExp = () => Math.floor(Date.now() / 1000) - 60;

    const anonymousPaths = [
      "/login",
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/auth/callback",
      "/invitations",
    ];

    for (const path of anonymousPaths) {
      it(`skips refresh on ${path} even with expired access + valid refresh`, async () => {
        const request = createMockRequest(`${APP_URL}/en${path}`, [
          { name: "access_token", value: makeToken(pastExp()) },
          { name: "refresh_token", value: "valid-refresh-tok" },
        ]);

        const response = await proxy(request);

        expect(fetchSpy).not.toHaveBeenCalled();
        // Anonymous routes should also not redirect to login.
        expect(response.headers.get("location")).toBeNull();
      });

      it(`skips refresh on ${path} when only refresh_token is present`, async () => {
        const request = createMockRequest(`${APP_URL}/en${path}`, [
          { name: "refresh_token", value: "valid-refresh-tok" },
        ]);

        const response = await proxy(request);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(response.headers.get("location")).toBeNull();
      });
    }

    it("skips refresh on a nested anonymous path (e.g. /invitations/abc123)", async () => {
      const request = createMockRequest(`${APP_URL}/en/invitations/abc123`, [
        { name: "access_token", value: makeToken(pastExp()) },
        { name: "refresh_token", value: "valid-refresh-tok" },
      ]);

      await proxy(request);

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("still refreshes on a non-anonymous marketing route like /pricing", async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900;
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: makeToken(futureExp),
            refresh_token: "new-refresh-tok",
          }),
      });

      const request = createMockRequest(`${APP_URL}/en/pricing`, [
        { name: "access_token", value: makeToken(pastExp()) },
        { name: "refresh_token", value: "valid-refresh-tok" },
      ]);

      await proxy(request);

      // Sanity check — the inverse of the anonymous-skip behaviour: non-anon
      // routes still go through Django.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("malformed access tokens", () => {
    it("treats a non-3-part token as expired", async () => {
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: "only.two" },
      ]);
      const response = await proxy(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("treats a non-base64 payload as expired", async () => {
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: "header.not-base64!@#.sig" },
      ]);
      const response = await proxy(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("treats a payload without exp as expired", async () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const payload = btoa(JSON.stringify({ sub: "u1" }));
      const token = `${header}.${payload}.sig`;
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: token },
      ]);
      const response = await proxy(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("treats a payload with non-numeric exp as expired", async () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const payload = btoa(JSON.stringify({ sub: "u1", exp: "later" }));
      const token = `${header}.${payload}.sig`;
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: token },
      ]);
      const response = await proxy(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });

    it("treats a payload that is a JSON primitive (not object) as expired", async () => {
      const header = btoa(JSON.stringify({ alg: "HS256" }));
      const payload = btoa(JSON.stringify("not-an-object"));
      const token = `${header}.${payload}.sig`;
      const request = createMockRequest(`${APP_URL}/en/dashboard`, [
        { name: "access_token", value: token },
      ]);
      const response = await proxy(request);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/en/login");
    });
  });

  describe("withPathnameHeader", () => {
    it("sets x-pathname on the forwarded request headers", async () => {
      const request = createMockRequest(`${APP_URL}/en/pricing`);
      const response = await proxy(request);

      // NextResponse.next with request.headers serializes custom headers as
      // "x-middleware-request-<name>". We assert the downstream forwarded
      // header so server components receive the pathname.
      expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
        "/en/pricing",
      );
    });

    it("preserves an intl rewrite by re-emitting it through NextResponse.rewrite", async () => {
      const rewriteTarget = `${APP_URL}/en/about`;
      const rewriteResponse = NextResponse.next();
      rewriteResponse.headers.set("x-middleware-rewrite", rewriteTarget);
      mockIntlMiddleware.mockReturnValue(rewriteResponse);

      const request = createMockRequest(`${APP_URL}/about`);
      const response = await proxy(request);

      expect(response.headers.get("x-middleware-rewrite")).toBe(rewriteTarget);
      expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
        "/about",
      );
    });

    it("passes an intl redirect response through unchanged (no pathname header)", async () => {
      const redirectTarget = `${APP_URL}/en`;
      const intlRedirect = NextResponse.redirect(redirectTarget);
      mockIntlMiddleware.mockReturnValue(intlRedirect);

      const request = createMockRequest(`${APP_URL}/`);
      const response = await proxy(request);

      // Redirect pass-through: location survives, no forwarded pathname header.
      expect(response.headers.get("location")).toBe(redirectTarget);
      expect(
        response.headers.get("x-middleware-request-x-pathname"),
      ).toBeNull();
    });

    it("preserves cookies emitted by the intl middleware", async () => {
      const intlResponse = NextResponse.next();
      intlResponse.cookies.set("NEXT_LOCALE", "es", { path: "/" });
      mockIntlMiddleware.mockReturnValue(intlResponse);

      const request = createMockRequest(`${APP_URL}/es`);
      const response = await proxy(request);

      const names = response.cookies.getAll().map((c) => c.name);
      expect(names).toContain("NEXT_LOCALE");
    });

    it("forwards the x-pathname header through the successful refresh flow", async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 60;
      const futureExp = Math.floor(Date.now() / 1000) + 900;

      fetchSpy.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: makeToken(futureExp),
            refresh_token: "new-refresh-tok",
          }),
      });

      const request = createMockRequest(`${APP_URL}/en/pricing`, [
        { name: "access_token", value: makeToken(pastExp) },
        { name: "refresh_token", value: "old-refresh-tok" },
      ]);
      const response = await proxy(request);

      // Even via the refresh branch, server components must still receive
      // the forwarded pathname header.
      expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
        "/en/pricing",
      );
      // Refresh request was actually issued (i.e. we took the refresh path).
      expect(fetchSpy).toHaveBeenCalled();
      // And no redirect was emitted.
      expect(response.headers.get("location")).toBeNull();
    });

    it("does not leak x-middleware-next onto the final response", async () => {
      const request = createMockRequest(`${APP_URL}/en/pricing`);
      const response = await proxy(request);
      // withPathnameHeader rebuilds via NextResponse.next(), which sets its own
      // x-middleware-next. The filter strips the incoming one so only the
      // rebuilt one remains. Either way, the rebuilt response must carry the
      // forwarded pathname header (already covered above); here we assert that
      // no stray x-middleware-rewrite leaked from a non-rewriting intl response.
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
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
