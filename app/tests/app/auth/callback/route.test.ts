import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockExchangeCodeForSession = vi.fn();
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
    },
  }),
}));

import { GET } from "@/app/[locale]/auth/callback/route";

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost:3000/en/auth/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /dashboard on successful code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(makeRequest({ code: "valid-code" }));
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });

  it("redirects to custom next path on successful code exchange", async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await GET(
      makeRequest({ code: "valid-code", next: "/reset-password" }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/reset-password",
    );
  });

  it("redirects to /login with oauth_error when error param is present", async () => {
    const response = await GET(makeRequest({ error: "access_denied" }));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_error");
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("redirects to /login with oauth_error when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "Exchange failed" },
    });

    const response = await GET(makeRequest({ code: "bad-code" }));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_error");
  });

  it("redirects to /login with oauth_error when no code or error param", async () => {
    const response = await GET(makeRequest({}));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_error");
  });
});
