import { describe, it, expect } from "vitest";
import {
  parseIntervalParam,
  PRICING_INTERVAL_HREFS,
  SUBSCRIPTION_INTERVAL_HREFS,
} from "@/app/[locale]/_lib/pricingInterval";

describe("parseIntervalParam", () => {
  it("returns the raw value when it equals 'month'", () => {
    expect(parseIntervalParam("month", "year")).toBe("month");
  });

  it("returns the raw value when it equals 'year'", () => {
    expect(parseIntervalParam("year", "month")).toBe("year");
  });

  it("falls back to 'month' by default when the raw value is undefined", () => {
    expect(parseIntervalParam(undefined)).toBe("month");
  });

  it("honours the provided fallback when the raw value is undefined", () => {
    expect(parseIntervalParam(undefined, "year")).toBe("year");
  });

  it("falls back when the raw value is an unrecognised string", () => {
    expect(parseIntervalParam("week", "month")).toBe("month");
  });

  it("is case-sensitive — uppercase variants fall back", () => {
    expect(parseIntervalParam("MONTH", "year")).toBe("year");
  });

  it("falls back when the raw value is an empty string", () => {
    expect(parseIntervalParam("", "year")).toBe("year");
  });
});

describe("interval href constants", () => {
  it("PRICING_INTERVAL_HREFS points at /pricing", () => {
    expect(PRICING_INTERVAL_HREFS).toEqual({
      monthlyHref: "/pricing?interval=month",
      yearlyHref: "/pricing?interval=year",
    });
  });

  it("SUBSCRIPTION_INTERVAL_HREFS points at /subscription", () => {
    expect(SUBSCRIPTION_INTERVAL_HREFS).toEqual({
      monthlyHref: "/subscription?interval=month",
      yearlyHref: "/subscription?interval=year",
    });
  });
});
