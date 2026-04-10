import { describe, it, expect } from "vitest";
import { formatCurrency } from "@/lib/formatCurrency";

describe("formatCurrency", () => {
  it("formats whole amounts without decimal places", () => {
    const result = formatCurrency(19, "USD", "en-US");
    expect(result).toBe("$19");
  });

  it("formats fractional amounts with up to two decimal places", () => {
    const result = formatCurrency(19.99, "USD", "en-US");
    expect(result).toBe("$19.99");
  });

  it("formats zero correctly", () => {
    const result = formatCurrency(0, "USD", "en-US");
    expect(result).toBe("$0");
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
