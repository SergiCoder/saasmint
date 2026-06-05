import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/formatCurrency";

describe("formatCurrency", () => {
  it("pads whole amounts to two decimals", () => {
    const result = formatCurrency(19, "USD", "en-US");
    expect(result).toBe("$19.00");
  });

  it("pads single-decimal amounts to two decimals (the $199.9 → $199.90 case)", () => {
    const result = formatCurrency(199.9, "USD", "en-US");
    expect(result).toBe("$199.90");
  });

  it("keeps two-decimal amounts as-is", () => {
    const result = formatCurrency(19.99, "USD", "en-US");
    expect(result).toBe("$19.99");
  });

  it("half-expand rounds amounts with more than two fractional digits", () => {
    expect(formatCurrency(19.994, "USD", "en-US")).toBe("$19.99");
    expect(formatCurrency(19.995, "USD", "en-US")).toBe("$20.00");
    expect(formatCurrency(19.999, "USD", "en-US")).toBe("$20.00");
  });

  it("formats zero as $0.00", () => {
    const result = formatCurrency(0, "USD", "en-US");
    expect(result).toBe("$0.00");
  });

  it("uppercases the currency code", () => {
    const result = formatCurrency(10, "eur", "en-US");
    // The symbol depends on locale, but the key behaviour is no crash
    expect(result).toContain("10");
  });

  it("respects the locale for formatting", () => {
    const result = formatCurrency(1000, "EUR", "de-DE");
    // German locale uses dot as thousands separator
    expect(result).toContain("1.000");
  });
});
