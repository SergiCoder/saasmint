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

  it.each(OAUTH_PROVIDERS)(
    "never includes an account_type query param (%s)",
    (provider) => {
      // Backend ignores account_type as of the org_already_owned rename — the
      // frontend must not send it for any provider, since stripping it
      // client-side is the only way to surface a regression if a future
      // caller tries to reintroduce it.
      const url = new URL(getOAuthRedirectUrl(provider));
      expect(url.searchParams.has("account_type")).toBe(false);
      expect(url.search).toBe("");
    },
  );
});
