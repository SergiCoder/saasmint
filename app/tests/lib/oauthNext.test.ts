import { describe, it, expect } from "vitest";
import {
  validateNext,
  OAUTH_NEXT_ALLOWLIST,
  OAUTH_NEXT_FALLBACK,
} from "@/lib/oauthNext";

const ORIGIN = "https://app.example.com";

describe("validateNext", () => {
  describe("passes through allowlisted paths", () => {
    for (const path of OAUTH_NEXT_ALLOWLIST) {
      it(`allows ${path}`, () => {
        expect(validateNext(path, ORIGIN)).toBe(path);
      });
    }

    it("allows allowlisted path with query string", () => {
      expect(validateNext("/dashboard?tab=billing", ORIGIN)).toBe(
        "/dashboard?tab=billing",
      );
    });

    it("allows allowlisted path with fragment", () => {
      expect(validateNext("/dashboard#section", ORIGIN)).toBe(
        "/dashboard#section",
      );
    });

    it("allows allowlisted path with trailing slash", () => {
      expect(validateNext("/dashboard/", ORIGIN)).toBe("/dashboard/");
    });

    it("strips locale prefix before comparing against allowlist", () => {
      expect(validateNext("/en/dashboard", ORIGIN)).toBe("/en/dashboard");
    });

    it("allows allowlisted checkout with plan query", () => {
      expect(
        validateNext("/subscription/checkout?plan=price_pro", ORIGIN),
      ).toBe("/subscription/checkout?plan=price_pro");
    });

    it("allows team-checkout under locale prefix", () => {
      expect(
        validateNext("/es/subscription/team-checkout?plan=x", ORIGIN),
      ).toBe("/es/subscription/team-checkout?plan=x");
    });

    it("resolves leading traversal to allowlisted target", () => {
      // "/../dashboard" resolves to "/dashboard" — safe and allowlisted
      expect(validateNext("/../dashboard", ORIGIN)).toBe("/dashboard");
    });
  });

  describe("falls back to /dashboard", () => {
    const cases: Array<[string, string | undefined | null]> = [
      ["undefined", undefined],
      ["null", null],
      ["empty string", ""],
      ["absolute URL", "https://evil.com"],
      ["protocol-relative", "//evil.com"],
      ["backslash injection", "/\\evil.com"],
      ["javascript: URI", "javascript:alert(1)"],
      ["relative without leading slash", "dashboard"],
      ["admin path not in allowlist", "/admin/users"],
      ["random path not in allowlist", "/random/path"],
      ["dashboard with traversal tail", "/dashboard/../admin"],
      ["traversal inside locale prefix", "/en/../admin"],
      ["internal debug path", "/internal/debug"],
    ];

    for (const [label, candidate] of cases) {
      it(`rejects ${label}`, () => {
        expect(validateNext(candidate, ORIGIN)).toBe(OAUTH_NEXT_FALLBACK);
      });
    }
  });
});
