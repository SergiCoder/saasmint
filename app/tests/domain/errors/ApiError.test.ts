import { describe, it, expect } from "vitest";
import { ApiError } from "@/domain/errors/ApiError";
import { DomainError } from "@/domain/errors/DomainError";

describe("ApiError", () => {
  it("sets status, body, and default HTTP_<status> code", () => {
    const err = new ApiError(404, { detail: "Not Found" });
    expect(err.status).toBe(404);
    expect(err.body).toEqual({ detail: "Not Found" });
    expect(err.code).toBe("HTTP_404");
    expect(err.message).toBe("API 404");
    expect(err.name).toBe("ApiError");
  });

  it("accepts an explicit code override", () => {
    const err = new ApiError(409, { detail: "Conflict" }, "CONFLICT");
    expect(err.code).toBe("CONFLICT");
  });

  it("is an instance of DomainError and Error", () => {
    const err = new ApiError(500, null);
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(Error);
  });

  describe("detail getter", () => {
    it("returns the string detail from a Django-style object body", () => {
      const err = new ApiError(400, { detail: "Email already in use." });
      expect(err.detail).toBe("Email already in use.");
    });

    it("joins an array of strings with a space", () => {
      const err = new ApiError(422, ["Field required.", "Invalid email."]);
      expect(err.detail).toBe("Field required. Invalid email.");
    });

    it("returns null for an empty string array", () => {
      const err = new ApiError(422, []);
      expect(err.detail).toBeNull();
    });

    it("filters non-string array entries and returns null when none remain", () => {
      const err = new ApiError(422, [1, 2, 3]);
      expect(err.detail).toBeNull();
    });

    it("joins only the string entries when the array is mixed", () => {
      const err = new ApiError(422, ["only this", 42, { nope: true }]);
      expect(err.detail).toBe("only this");
    });

    it("returns null when detail is not a string", () => {
      const err = new ApiError(400, { detail: 123 });
      expect(err.detail).toBeNull();
    });

    it("returns null when body has no detail key", () => {
      const err = new ApiError(500, { error: "internal" });
      expect(err.detail).toBeNull();
    });

    it("returns null when body is a plain string", () => {
      const err = new ApiError(502, "Bad Gateway");
      expect(err.detail).toBeNull();
    });

    it("returns null when body is null", () => {
      const err = new ApiError(500, null);
      expect(err.detail).toBeNull();
    });

    it("returns null when body is undefined", () => {
      const err = new ApiError(500, undefined);
      expect(err.detail).toBeNull();
    });
  });
});
