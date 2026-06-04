import { describe, it, expect } from "vitest";
import { assertTrustedRedirect } from "@/app/[locale]/(app)/subscription/_data/trustedRedirect";

describe("assertTrustedRedirect", () => {
  it("accepts https://checkout.stripe.com URLs", () => {
    expect(() =>
      assertTrustedRedirect("https://checkout.stripe.com/c/pay/cs_test_123"),
    ).not.toThrow();
  });

  it("accepts https://billing.stripe.com URLs", () => {
    expect(() =>
      assertTrustedRedirect("https://billing.stripe.com/p/session/abc"),
    ).not.toThrow();
  });

  it("throws on a malformed URL string", () => {
    expect(() => assertTrustedRedirect("not a url")).toThrow(
      "Invalid redirect URL",
    );
  });

  it("throws when the protocol is not https", () => {
    expect(() =>
      assertTrustedRedirect("http://checkout.stripe.com/c/pay/cs_test_123"),
    ).toThrow("Untrusted redirect URL");
  });

  it("throws on javascript: URLs even with a stripe-looking host", () => {
    expect(() =>
      assertTrustedRedirect("javascript:alert('xss')//checkout.stripe.com"),
    ).toThrow("Untrusted redirect URL");
  });

  it("throws when the host is not on the allow list", () => {
    expect(() =>
      assertTrustedRedirect("https://evil.example.com/c/pay/cs_test_123"),
    ).toThrow("Untrusted redirect URL");
  });

  it("rejects subdomains of stripe.com that are not exactly checkout/billing", () => {
    expect(() =>
      assertTrustedRedirect("https://api.stripe.com/v1/checkout"),
    ).toThrow("Untrusted redirect URL");
  });

  it("rejects look-alike hosts that contain checkout.stripe.com as a substring", () => {
    expect(() =>
      assertTrustedRedirect("https://checkout.stripe.com.evil.com/path"),
    ).toThrow("Untrusted redirect URL");
  });
});
