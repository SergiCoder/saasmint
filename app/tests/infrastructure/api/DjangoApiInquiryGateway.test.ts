import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPublicApiFetchVoid = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  publicApiFetchVoid: (...args: unknown[]) => mockPublicApiFetchVoid(...args),
}));

const { DjangoApiInquiryGateway } =
  await import("@/infrastructure/api/DjangoApiInquiryGateway");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiInquiryGateway", () => {
  const gateway = new DjangoApiInquiryGateway();

  it("posts a landing-cta inquiry with empty message and honeypot defaults", async () => {
    mockPublicApiFetchVoid.mockResolvedValue(undefined);

    await gateway.submit({
      email: "user@example.com",
      source: "landing-cta",
    });

    expect(mockPublicApiFetchVoid).toHaveBeenCalledWith(
      "/marketing/inquiries/",
      {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          message: "",
          source: "landing-cta",
          honeypot: "",
        }),
      },
    );
  });

  it("posts a contact-page inquiry with the provided message", async () => {
    mockPublicApiFetchVoid.mockResolvedValue(undefined);

    await gateway.submit({
      email: "user@example.com",
      message: "Hello, I'd like to learn more.",
      source: "contact-page",
    });

    expect(mockPublicApiFetchVoid).toHaveBeenCalledWith(
      "/marketing/inquiries/",
      {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          message: "Hello, I'd like to learn more.",
          source: "contact-page",
          honeypot: "",
        }),
      },
    );
  });

  it("propagates errors from publicApiFetchVoid", async () => {
    mockPublicApiFetchVoid.mockRejectedValue(
      new Error("API 429: rate limited"),
    );

    await expect(
      gateway.submit({ email: "user@example.com", source: "landing-cta" }),
    ).rejects.toThrow("API 429: rate limited");
  });
});
