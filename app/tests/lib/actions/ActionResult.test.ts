import { describe, it, expect } from "vitest";
import { ok, fail, toActionError } from "@/lib/actions/ActionResult";
import { ApiError } from "@/domain/errors/ApiError";
import { AuthError } from "@/domain/errors/AuthError";
import { BillingError } from "@/domain/errors/BillingError";
import { NetworkError } from "@/domain/errors/NetworkError";

describe("ok", () => {
  it("returns a void success envelope without a data key", () => {
    const result = ok();
    expect(result).toEqual({ ok: true });
    expect(result).not.toHaveProperty("data");
  });

  it("wraps provided data in a success envelope", () => {
    const result = ok({ id: "u1" });
    expect(result).toEqual({ ok: true, data: { id: "u1" } });
  });

  it("wraps an empty object", () => {
    expect(ok({})).toEqual({ ok: true, data: {} });
  });

  it("wraps an array (also struct-shaped)", () => {
    expect(ok(["a", "b"])).toEqual({ ok: true, data: ["a", "b"] });
  });
});

describe("fail", () => {
  it("returns a bare error envelope when no extras are provided", () => {
    expect(fail("bad_thing")).toEqual({ ok: false, code: "bad_thing" });
  });

  it("omits fieldErrors when extras is empty", () => {
    expect(fail("bad_thing", {})).toEqual({ ok: false, code: "bad_thing" });
  });

  it("forwards fieldErrors when provided", () => {
    expect(
      fail("invalid_input", { fieldErrors: { email: "required" } }),
    ).toEqual({
      ok: false,
      code: "invalid_input",
      fieldErrors: { email: "required" },
    });
  });
});

describe("toActionError", () => {
  it("maps AuthError to session_expired regardless of the error's own code", () => {
    expect(toActionError(new AuthError("nope", "NO_SESSION"))).toEqual({
      ok: false,
      code: "session_expired",
    });
  });

  it("maps NetworkError to network_unreachable", () => {
    expect(toActionError(new NetworkError("down"))).toEqual({
      ok: false,
      code: "network_unreachable",
    });
  });

  it("forwards BillingError's code", () => {
    expect(
      toActionError(new BillingError("no payment method", "NO_PAYMENT_METHOD")),
    ).toEqual({ ok: false, code: "NO_PAYMENT_METHOD" });
  });

  it("maps ApiError to its stable code, dropping the backend `detail`", () => {
    const err = new ApiError(400, { detail: "invalid email" });
    expect(toActionError(err)).toEqual({ ok: false, code: "HTTP_400" });
  });

  it("maps ApiError without a recognisable body, emitting just the code", () => {
    const err = new ApiError(500, "<!DOCTYPE html>");
    expect(toActionError(err)).toEqual({ ok: false, code: "HTTP_500" });
  });

  it("respects a custom ApiError code", () => {
    const err = new ApiError(409, { detail: "conflict" }, "CUSTOM_CODE");
    expect(toActionError(err)).toEqual({ ok: false, code: "CUSTOM_CODE" });
  });

  it("collapses plain Error to unknown_error", () => {
    expect(toActionError(new Error("boom"))).toEqual({
      ok: false,
      code: "unknown_error",
    });
  });

  it("collapses non-Error throwables (string, null, undefined) to unknown_error", () => {
    expect(toActionError("string error")).toEqual({
      ok: false,
      code: "unknown_error",
    });
    expect(toActionError(null)).toEqual({ ok: false, code: "unknown_error" });
    expect(toActionError(undefined)).toEqual({
      ok: false,
      code: "unknown_error",
    });
  });
});
