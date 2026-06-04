import { describe, it, expect } from "vitest";
import { LOCALES } from "@/lib/i18n/locales";
import { routing } from "@/lib/i18n/routing";

describe("LOCALES", () => {
  it("contains one entry for every locale declared in routing.locales", () => {
    expect(LOCALES).toHaveLength(routing.locales.length);
  });

  it("preserves the routing.locales order (code field matches in sequence)", () => {
    for (let i = 0; i < routing.locales.length; i++) {
      expect(LOCALES[i]!.code).toBe(routing.locales[i]);
    }
  });

  it("every entry has a non-empty label", () => {
    for (const entry of LOCALES) {
      expect(typeof entry.label).toBe("string");
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("includes an entry for the default locale 'en'", () => {
    const en = LOCALES.find((l) => l.code === "en");
    expect(en).toBeDefined();
    expect(en?.label).toBeTruthy();
  });

  it("includes an entry for the right-to-left locale 'ar'", () => {
    const ar = LOCALES.find((l) => l.code === "ar");
    expect(ar).toBeDefined();
    expect(ar?.label).toBeTruthy();
  });

  it("each code in LOCALES is a valid locale recognised by isLocale()", async () => {
    const { isLocale } = await import("@/lib/i18n/routing");
    for (const entry of LOCALES) {
      expect(isLocale(entry.code)).toBe(true);
    }
  });
});
