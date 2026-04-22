import { describe, it, expect } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";
import { BillingError } from "@/domain/errors/BillingError";
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
