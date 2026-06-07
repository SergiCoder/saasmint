import { describe, it, expect } from "vitest";
import {
  PRICING_CURRENCIES,
  normalizePricingCurrency,
  catalogParamsForCurrency,
} from "@/domain/data/pricingCurrencies";

describe("PRICING_CURRENCIES", () => {
  it("offers the full 20-currency supported set", () => {
    expect(PRICING_CURRENCIES).toHaveLength(20);
  });

  it("is sorted alphabetically by code with unique codes", () => {
    const codes = PRICING_CURRENCIES.map((c) => c.code);
    expect(codes).toEqual([...codes].sort());
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("marks exactly the 7 launch markets with a representative country", () => {
    const launch = PRICING_CURRENCIES.filter((c) => c.country);
    expect(launch.map((c) => c.code).sort()).toEqual([
      "cny",
      "dkk",
      "eur",
      "gbp",
      "pln",
      "sek",
      "usd",
    ]);
  });
});

describe("normalizePricingCurrency", () => {
  it("lowercases and accepts a supported code", () => {
    expect(normalizePricingCurrency("EUR")).toBe("eur");
    expect(normalizePricingCurrency(" chf ")).toBe("chf");
  });

  it("returns '' for an unsupported or empty code", () => {
    expect(normalizePricingCurrency("xyz")).toBe("");
    expect(normalizePricingCurrency(undefined)).toBe("");
    expect(normalizePricingCurrency("")).toBe("");
  });
});

describe("catalogParamsForCurrency", () => {
  it("maps a launch-market currency to ?country= (tax-inclusive path)", () => {
    expect(catalogParamsForCurrency("eur")).toEqual({ country: "ES" });
    expect(catalogParamsForCurrency("gbp")).toEqual({ country: "GB" });
    expect(catalogParamsForCurrency("usd")).toEqual({ country: "US" });
  });

  it("maps a display-only currency to ?currency= (FX path)", () => {
    expect(catalogParamsForCurrency("chf")).toEqual({ currency: "chf" });
    expect(catalogParamsForCurrency("jpy")).toEqual({ currency: "jpy" });
  });

  it("returns {} for an unknown/empty code so the backend auto-detects", () => {
    expect(catalogParamsForCurrency("")).toEqual({});
    expect(catalogParamsForCurrency("xyz")).toEqual({});
  });

  it("covers every offered currency with exactly one routed param", () => {
    for (const c of PRICING_CURRENCIES) {
      const params = catalogParamsForCurrency(c.code);
      const keys = Object.keys(params);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toBe(c.country ? "country" : "currency");
    }
  });
});
