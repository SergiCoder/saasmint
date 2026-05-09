import { describe, it, expect } from "vitest";
import {
  isLocale,
  RTL_LOCALES,
  routing,
  stripLocalePrefix,
} from "@/lib/i18n/routing";

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

describe("stripLocalePrefix", () => {
  it("strips a simple locale prefix from a nested pathname", () => {
    expect(stripLocalePrefix("/en/dashboard")).toBe("/dashboard");
  });

  it("strips a hyphenated locale prefix (longest-match against shorter prefixes)", () => {
    expect(stripLocalePrefix("/pt-BR/profile/settings")).toBe(
      "/profile/settings",
    );
  });

  it("returns '/' for a bare locale-root pathname", () => {
    expect(stripLocalePrefix("/en")).toBe("/");
    expect(stripLocalePrefix("/pt-BR")).toBe("/");
  });

  it("returns the pathname unchanged when it does not start with a locale", () => {
    expect(stripLocalePrefix("/other/path")).toBe("/other/path");
    expect(stripLocalePrefix("/")).toBe("/");
  });

  it("does not match a path whose first segment merely starts with a locale", () => {
    // "english" begins with "en" but is not the "en" locale segment.
    expect(stripLocalePrefix("/english/about")).toBe("/english/about");
  });
});

describe("RTL_LOCALES", () => {
  it("contains 'ar' (Arabic is right-to-left)", () => {
    expect(RTL_LOCALES.has("ar")).toBe(true);
  });

  it("does not contain LTR locales like 'en'", () => {
    expect(RTL_LOCALES.has("en")).toBe(false);
  });
});
