import { describe, it, expect } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";
import { BillingError } from "@/domain/errors/BillingError";
import { NetworkError } from "@/domain/errors/NetworkError";
import type { DomainError } from "@/domain/errors/DomainError";

type DomainErrorCtor = new (
  message: string,
  code: string,
  options?: ErrorOptions,
) => DomainError;

const SUBCLASSES: ReadonlyArray<[string, DomainErrorCtor]> = [
  ["AuthError", AuthError],
  ["BillingError", BillingError],
];

describe.each(SUBCLASSES)("%s", (name, Ctor) => {
  it("sets message, code, and name", () => {
    const err = new Ctor("something failed", "SOMETHING_FAILED");
    expect(err.message).toBe("something failed");
    expect(err.code).toBe("SOMETHING_FAILED");
    expect(err.name).toBe(name);
  });

  it("is an instance of Error", () => {
    expect(new Ctor("msg", "CODE")).toBeInstanceOf(Error);
  });

  it("preserves cause when provided", () => {
    const cause = new Error("original");
    const err = new Ctor("wrapped", "WRAPPED", { cause });
    expect(err.cause).toBe(cause);
  });
});

describe("NetworkError", () => {
  it("sets the hardcoded NETWORK_UNREACHABLE code from the constructor", () => {
    const err = new NetworkError("server unreachable");
    expect(err.code).toBe("NETWORK_UNREACHABLE");
    expect(err.message).toBe("server unreachable");
    expect(err.name).toBe("NetworkError");
  });

  it("is an instance of Error", () => {
    expect(new NetworkError("msg")).toBeInstanceOf(Error);
  });

  it("preserves cause when provided (wraps the underlying fetch failure)", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new NetworkError("unreachable", { cause });
    expect(err.cause).toBe(cause);
  });
});
