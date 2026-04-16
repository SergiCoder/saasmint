import { describe, it, expect } from "vitest";
import { friendlyError } from "@/lib/friendlyError";

describe("friendlyError", () => {
  it("returns fallback for non-Error values", () => {
    expect(friendlyError("string", "fallback")).toBe("fallback");
    expect(friendlyError(42, "fallback")).toBe("fallback");
    expect(friendlyError(null, "fallback")).toBe("fallback");
    expect(friendlyError(undefined, "fallback")).toBe("fallback");
  });

  it("returns fallback when error message does not match API pattern", () => {
    const err = new Error("Something went wrong");
    expect(friendlyError(err, "fallback")).toBe("fallback");
  });

  it("extracts detail from JSON body", () => {
    const err = new Error('API 400: {"detail":"Email already exists"}');
    expect(friendlyError(err, "fallback")).toBe("Email already exists");
  });

  it("joins array body into a single string", () => {
    const err = new Error('API 422: ["Field required.","Invalid email."]');
    expect(friendlyError(err, "fallback")).toBe(
      "Field required. Invalid email.",
    );
  });

  it("returns fallback when JSON body has no detail field", () => {
    const err = new Error('API 500: {"error":"internal"}');
    expect(friendlyError(err, "fallback")).toBe("fallback");
  });

  it("returns fallback when body is not valid JSON", () => {
    const err = new Error("API 502: Bad Gateway");
    expect(friendlyError(err, "fallback")).toBe("fallback");
  });

  it("handles various HTTP status codes", () => {
    const err401 = new Error('API 401: {"detail":"Unauthorized"}');
    expect(friendlyError(err401, "fallback")).toBe("Unauthorized");

    const err404 = new Error('API 404: {"detail":"Not found"}');
    expect(friendlyError(err404, "fallback")).toBe("Not found");
  });

  it("handles multiline JSON body", () => {
    const body = JSON.stringify({ detail: "Line one\nLine two" });
    const err = new Error(`API 400: ${body}`);
    expect(friendlyError(err, "fallback")).toBe("Line one\nLine two");
  });

  it("returns fallback when detail is not a string", () => {
    const err = new Error('API 400: {"detail":123}');
    expect(friendlyError(err, "fallback")).toBe("fallback");
  });
});
