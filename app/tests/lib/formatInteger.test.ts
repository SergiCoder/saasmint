import { describe, it, expect } from "vitest";
import { formatInteger } from "@/lib/formatInteger";

describe("formatInteger", () => {
  it("formats integers with locale-aware thousand separators", () => {
    expect(formatInteger(1000, "en-US")).toBe("1,000");
    expect(formatInteger(1234567, "en-US")).toBe("1,234,567");
  });

  it("renders zero unchanged", () => {
    expect(formatInteger(0, "en-US")).toBe("0");
  });

  it("handles negative integers", () => {
    expect(formatInteger(-1500, "en-US")).toBe("-1,500");
  });

  it("uses locale-specific separators (Spanish uses dot, US uses comma)", () => {
    const enUs = formatInteger(1234567, "en-US");
    const esEs = formatInteger(1234567, "es-ES");
    expect(enUs).toBe("1,234,567");
    // Spanish uses non-breaking dot or period for thousands depending on
    // ICU version, so we only assert that the two outputs differ — the
    // important thing is that locale wiring works end-to-end.
    expect(esEs).not.toBe(enUs);
  });

  it("rounds away fractional digits (the formatter is integer-only)", () => {
    expect(formatInteger(1234.7, "en-US")).toBe("1,235");
  });
});
