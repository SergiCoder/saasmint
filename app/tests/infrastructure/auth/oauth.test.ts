import { describe, it, expect } from "vitest";
import {
  OAUTH_PROVIDERS,
  getOAuthRedirectUrl,
  isOAuthProvider,
} from "@/infrastructure/auth/oauth";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

describe("OAUTH_PROVIDERS", () => {
  it("lists google, github, and microsoft", () => {
    expect(OAUTH_PROVIDERS).toEqual(["google", "github", "microsoft"]);
  });
});

describe("isOAuthProvider", () => {
  it("accepts the three known providers", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("github")).toBe(true);
    expect(isOAuthProvider("microsoft")).toBe(true);
  });

  it("rejects unknown providers", () => {
    expect(isOAuthProvider("linkedin")).toBe(false);
    expect(isOAuthProvider("")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isOAuthProvider(42)).toBe(false);
    expect(isOAuthProvider(null)).toBe(false);
    expect(isOAuthProvider(undefined)).toBe(false);
    expect(isOAuthProvider({})).toBe(false);
  });
});

describe("getOAuthRedirectUrl", () => {
  it("returns the Django OAuth authorize URL for the provider", () => {
    expect(getOAuthRedirectUrl("google")).toBe(
      `${API_URL}/api/v1/auth/oauth/google/`,
    );
    expect(getOAuthRedirectUrl("github")).toBe(
      `${API_URL}/api/v1/auth/oauth/github/`,
    );
    expect(getOAuthRedirectUrl("microsoft")).toBe(
      `${API_URL}/api/v1/auth/oauth/microsoft/`,
    );
  });

  it("omits account_type when isTeam is falsy", () => {
    const url = new URL(getOAuthRedirectUrl("google"));
    expect(url.searchParams.has("account_type")).toBe(false);

    const urlExplicit = new URL(
      getOAuthRedirectUrl("google", { isTeam: false }),
    );
    expect(urlExplicit.searchParams.has("account_type")).toBe(false);
  });

  it("appends account_type=org_owner when isTeam is true", () => {
    const url = new URL(getOAuthRedirectUrl("github", { isTeam: true }));
    expect(url.searchParams.get("account_type")).toBe("org_owner");
    expect(url.pathname).toBe("/api/v1/auth/oauth/github/");
  });
});
