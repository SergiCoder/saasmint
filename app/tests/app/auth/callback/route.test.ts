import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/[locale]/auth/callback/route";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function makeRequest(params: Record<string, string>) {
  const url = new URL(`${APP_URL}/en/auth/callback`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets auth cookies and redirects to /dashboard on success", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
      }),
    );

    const accessCookie = response.cookies.get("access_token");
    const refreshCookie = response.cookies.get("refresh_token");

    expect(accessCookie?.value).toBe("tok_abc");
    expect(refreshCookie?.value).toBe("ref_abc");
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });

  it("redirects to custom next path on success", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
        next: "/reset-password",
      }),
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
    expect(response.cookies.get("access_token")).toBeUndefined();
  });

  it("redirects to /login with oauth_error when no tokens provided", async () => {
    const response = await GET(makeRequest({}));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth_error");
  });

  it("blocks protocol-relative open redirect (//evil.com)", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
        next: "//evil.com",
      }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });

  it("blocks absolute URL open redirect", async () => {
    const response = await GET(
      makeRequest({
        access_token: "tok_abc",
        refresh_token: "ref_abc",
        expires_in: "900",
        next: "https://evil.com",
      }),
    );
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });
});
