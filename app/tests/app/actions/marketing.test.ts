import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/domain/errors/ApiError";

const mockSubmit = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  inquiryGateway: { submit: (...args: unknown[]) => mockSubmit(...args) },
}));

let submitInquiry: typeof import("@/app/actions/marketing").submitInquiry;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/marketing");
  submitInquiry = mod.submitInquiry;
});

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("submitInquiry", () => {
  it("submits a landing-cta inquiry and returns ok", async () => {
    mockSubmit.mockResolvedValue(undefined);

    const result = await submitInquiry(
      undefined,
      makeFormData({ email: "User@Example.com", source: "landing-cta" }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      message: undefined,
      source: "landing-cta",
    });
  });

  it("submits a contact-page inquiry with a trimmed message", async () => {
    mockSubmit.mockResolvedValue(undefined);

    const result = await submitInquiry(
      undefined,
      makeFormData({
        email: "user@example.com",
        message: "  hello there  ",
        source: "contact-page",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockSubmit).toHaveBeenCalledWith({
      email: "user@example.com",
      message: "hello there",
      source: "contact-page",
    });
  });

  it("silently returns ok and does NOT call the gateway when honeypot is filled", async () => {
    const result = await submitInquiry(
      undefined,
      makeFormData({
        email: "bot@example.com",
        source: "landing-cta",
        honeypot: "spammed",
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("returns invalid_input when source is missing or unrecognized", async () => {
    for (const source of ["", "footer-newsletter", "anything"]) {
      const result = await submitInquiry(
        undefined,
        makeFormData({ email: "user@example.com", source }),
      );
      expect(result).toEqual({ ok: false, code: "invalid_input" });
    }
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("returns email_required when email is missing", async () => {
    const result = await submitInquiry(
      undefined,
      makeFormData({ source: "landing-cta" }),
    );
    expect(result).toEqual({ ok: false, code: "email_required" });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("returns email_required when email exceeds the RFC 5321 limit", async () => {
    const result = await submitInquiry(
      undefined,
      makeFormData({
        email: `${"a".repeat(255)}@example.com`,
        source: "landing-cta",
      }),
    );
    expect(result).toEqual({ ok: false, code: "email_required" });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("returns message_required when contact-page submission has no message", async () => {
    const result = await submitInquiry(
      undefined,
      makeFormData({ email: "user@example.com", source: "contact-page" }),
    );
    expect(result).toEqual({ ok: false, code: "message_required" });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("returns message_too_long when message exceeds 5000 chars", async () => {
    const result = await submitInquiry(
      undefined,
      makeFormData({
        email: "user@example.com",
        source: "contact-page",
        message: "x".repeat(5001),
      }),
    );
    expect(result).toEqual({ ok: false, code: "message_too_long" });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("maps ApiError 429 to the rate-limit code via toActionError", async () => {
    mockSubmit.mockRejectedValue(new ApiError(429, ""));

    const result = await submitInquiry(
      undefined,
      makeFormData({ email: "user@example.com", source: "landing-cta" }),
    );

    expect(result).toEqual({ ok: false, code: "HTTP_429" });
  });

  it("maps an ApiError to its stable code, dropping the backend detail", async () => {
    mockSubmit.mockRejectedValue(
      new ApiError(400, { detail: "Email is invalid." }),
    );

    const result = await submitInquiry(
      undefined,
      makeFormData({ email: "user@example.com", source: "landing-cta" }),
    );

    expect(result).toEqual({ ok: false, code: "HTTP_400" });
  });

  it("returns unknown_error for non-ApiError throwables", async () => {
    mockSubmit.mockRejectedValue(new Error("boom"));

    const result = await submitInquiry(
      undefined,
      makeFormData({ email: "user@example.com", source: "landing-cta" }),
    );

    expect(result).toEqual({ ok: false, code: "unknown_error" });
  });
});
