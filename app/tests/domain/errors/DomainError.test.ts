import { describe, it, expect } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";
import { BillingError } from "@/domain/errors/BillingError";
import { OrgError } from "@/domain/errors/OrgError";

describe("AuthError", () => {
  it("sets message, code, and name", () => {
    const err = new AuthError("not authenticated", "UNAUTHENTICATED");
    expect(err.message).toBe("not authenticated");
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(err.name).toBe("AuthError");
  });

  it("is an instance of Error", () => {
    expect(new AuthError("msg", "CODE")).toBeInstanceOf(Error);
  });

  it("preserves cause when provided", () => {
    const cause = new Error("original");
    const err = new AuthError("wrapped", "WRAPPED", { cause });
    expect(err.cause).toBe(cause);
  });
});

describe("BillingError", () => {
  it("sets message, code, and name", () => {
    const err = new BillingError("payment failed", "PAYMENT_FAILED");
    expect(err.message).toBe("payment failed");
    expect(err.code).toBe("PAYMENT_FAILED");
    expect(err.name).toBe("BillingError");
  });

  it("is an instance of Error", () => {
    expect(new BillingError("msg", "CODE")).toBeInstanceOf(Error);
  });

  it("preserves cause when provided", () => {
    const cause = new Error("original");
    const err = new BillingError("wrapped", "WRAPPED", { cause });
    expect(err.cause).toBe(cause);
  });
});

describe("OrgError", () => {
  it("sets message, code, and name", () => {
    const err = new OrgError("not a member", "NOT_MEMBER");
    expect(err.message).toBe("not a member");
    expect(err.code).toBe("NOT_MEMBER");
    expect(err.name).toBe("OrgError");
  });

  it("is an instance of Error", () => {
    expect(new OrgError("msg", "CODE")).toBeInstanceOf(Error);
  });

  it("preserves cause when provided", () => {
    const cause = new Error("original");
    const err = new OrgError("wrapped", "WRAPPED", { cause });
    expect(err.cause).toBe(cause);
  });
});
