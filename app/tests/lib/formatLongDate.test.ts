import { describe, it, expect } from "vitest";
import { formatLongDate, formatMediumDate } from "@/lib/formatLongDate";

const EPOCH_2026_01_15 = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));

describe("formatLongDate", () => {
  it("formats a valid date with the long-date style for the requested locale", () => {
    const formatted = formatLongDate(EPOCH_2026_01_15, "en-US");
    // Long style across locales is ICU-specific, so we assert on stable
    // substrings rather than the exact rendering.
    expect(formatted).toContain("January");
    expect(formatted).toContain("2026");
  });

  it("returns an empty string for `new Date(NaN)` so callers can pass through unchecked ISO inputs", () => {
    expect(formatLongDate(new Date(NaN), "en-US")).toBe("");
  });

  it("produces locale-specific output for non-default locales", () => {
    const en = formatLongDate(EPOCH_2026_01_15, "en-US");
    const es = formatLongDate(EPOCH_2026_01_15, "es-ES");
    expect(en).not.toBe(es);
    expect(es.toLowerCase()).toContain("enero");
  });
});

describe("formatMediumDate", () => {
  it("formats a valid date with the medium-date style", () => {
    const formatted = formatMediumDate(EPOCH_2026_01_15, "en-US");
    // Medium style abbreviates the month name (e.g. "Jan 15, 2026").
    expect(formatted).toContain("Jan");
    expect(formatted).toContain("2026");
    expect(formatted).not.toContain("January");
  });

  it("returns an empty string for an invalid date", () => {
    expect(formatMediumDate(new Date(NaN), "en-US")).toBe("");
  });

  it("uses a separate cache entry from the long formatter (different output for the same date)", () => {
    const long = formatLongDate(EPOCH_2026_01_15, "en-US");
    const medium = formatMediumDate(EPOCH_2026_01_15, "en-US");
    expect(long).not.toBe(medium);
  });
});
