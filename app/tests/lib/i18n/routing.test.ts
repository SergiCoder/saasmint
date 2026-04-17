import { describe, it, expect } from "vitest";
import { isLocale, routing } from "@/lib/i18n/routing";

describe("isLocale", () => {
  it("returns true for every locale configured in routing.locales", () => {
    for (const locale of routing.locales) {
      expect(isLocale(locale)).toBe(true);
    }
  });

  it("narrows the type on true and works with the default locale", () => {
    const value: unknown = routing.defaultLocale;
    if (isLocale(value)) {
      // If this compiles, the type guard narrows `unknown` to Locale
      expect(value).toBe(routing.defaultLocale);
    } else {
      throw new Error("default locale should be recognised");
    }
  });

  it("returns false for unknown locale strings", () => {
    expect(isLocale("xx")).toBe(false);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("en-GB")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(123)).toBe(false);
    expect(isLocale({})).toBe(false);
    expect(isLocale([])).toBe(false);
    expect(isLocale(true)).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isLocale("")).toBe(false);
  });
});
