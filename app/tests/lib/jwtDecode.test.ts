import { describe, it, expect } from "vitest";
import { decodeJwtPayload } from "@/lib/jwtDecode";

/**
 * Helpers to build synthetic JWT strings for testing. The tests only care
 * about the payload segment (index 1); header and signature are stubbed with
 * minimal valid content.
 */
function makeJwt(payload: unknown): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

describe("decodeJwtPayload", () => {
  it("returns the payload object for a well-formed JWT", () => {
    const payload = { sub: "user-123", exp: 9999999999 };
    const token = makeJwt(payload);
    expect(decodeJwtPayload(token)).toEqual(payload);
  });

  it("returns null for an empty string", () => {
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null when the token has fewer than three dot-separated segments", () => {
    expect(decodeJwtPayload("onlyone")).toBeNull();
    expect(decodeJwtPayload("two.parts")).toBeNull();
  });

  it("returns null when the payload segment is an empty string", () => {
    // header..signature — the payload segment exists but is empty
    const token = `${btoa("{}")}.${btoa("")}.sig`;
    // atob("") succeeds and JSON.parse("") throws, so this falls through to null
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("returns null when the payload segment is not valid base64-encoded JSON", () => {
    const token = "header.!!!notbase64!!!.signature";
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("returns null when the payload decodes to a JSON primitive (string)", () => {
    const token = `header.${btoa('"a string"')}.sig`;
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("returns null when the payload decodes to null", () => {
    const token = `header.${btoa("null")}.sig`;
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("returns null when the payload decodes to a JSON array", () => {
    const token = `header.${btoa("[1,2,3]")}.sig`;
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("returns null when the payload decodes to a number", () => {
    const token = `header.${btoa("42")}.sig`;
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("preserves all claims on a valid payload", () => {
    const payload = {
      sub: "u-abc",
      email: "alice@example.com",
      exp: 1700000000,
      iat: 1699999100,
      extra: true,
    };
    const result = decodeJwtPayload(makeJwt(payload));
    expect(result).toEqual(payload);
  });

  it("handles a payload with no claims (empty object)", () => {
    const token = makeJwt({});
    expect(decodeJwtPayload(token)).toEqual({});
  });
});
