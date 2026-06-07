import { describe, it, expect } from "vitest";
import {
  PRICING_CURRENCIES,
  normalizePricingCurrency,
  pricingCountryForCurrency,
} from "@/domain/data/pricingCurrencies";

describe("normalizePricingCurrency", () => {
  it("lowercases and accepts a supported code", () => {
    expect(normalizePricingCurrency("EUR")).toBe("eur");
    expect(normalizePricingCurrency(" gbp ")).toBe("gbp");
  });

  it("returns '' for an unsupported or empty code", () => {
    expect(normalizePricingCurrency("chf")).toBe("");
    expect(normalizePricingCurrency(undefined)).toBe("");
    expect(normalizePricingCurrency("")).toBe("");
  });
});

describe("pricingCountryForCurrency", () => {
  it("maps each supported currency to its representative country", () => {
    expect(pricingCountryForCurrency("eur")).toBe("ES");
    expect(pricingCountryForCurrency("usd")).toBe("US");
    expect(pricingCountryForCurrency("gbp")).toBe("GB");
  });

  it("returns undefined for an unknown code so the caller omits ?country=", () => {
    expect(pricingCountryForCurrency("")).toBeUndefined();
    expect(pricingCountryForCurrency("chf")).toBeUndefined();
  });

  it("every offered currency resolves to a country (no dangling entries)", () => {
    for (const c of PRICING_CURRENCIES) {
      expect(pricingCountryForCurrency(c.code)).toBe(c.country);
    }
  });
});
