import { describe, it, expect } from "vitest";
import { isMemberOf, isRecord } from "@/lib/typeGuards";

describe("isRecord", () => {
  it("returns true for a plain object literal", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it("returns true for an Object.create(null) record", () => {
    expect(isRecord(Object.create(null))).toBe(true);
  });

  it("returns false for null", () => {
    expect(isRecord(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRecord(undefined)).toBe(false);
  });

  it("returns false for an array", () => {
    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
  });

  it("returns false for a primitive string", () => {
    expect(isRecord("hello")).toBe(false);
  });

  it("returns false for a primitive number", () => {
    expect(isRecord(42)).toBe(false);
  });

  it("returns false for a primitive boolean", () => {
    expect(isRecord(true)).toBe(false);
  });

  it("returns false for a class instance (custom prototype)", () => {
    class Foo {
      bar = 1;
    }
    expect(isRecord(new Foo())).toBe(false);
  });

  it("returns false for a Date", () => {
    expect(isRecord(new Date())).toBe(false);
  });

  it("returns false for a Map", () => {
    expect(isRecord(new Map())).toBe(false);
  });
});

describe("isMemberOf", () => {
  const tuple = ["red", "green", "blue"] as const;

  it("returns true when the value matches a tuple element", () => {
    expect(isMemberOf(tuple, "red")).toBe(true);
    expect(isMemberOf(tuple, "blue")).toBe(true);
  });

  it("returns false when the value is absent from the tuple", () => {
    expect(isMemberOf(tuple, "yellow")).toBe(false);
  });

  it("returns false for non-string values even if their stringified form matches", () => {
    expect(isMemberOf(tuple, 1)).toBe(false);
    expect(isMemberOf(tuple, undefined)).toBe(false);
    expect(isMemberOf(tuple, null)).toBe(false);
    expect(isMemberOf(tuple, {})).toBe(false);
  });

  it("returns false for an empty tuple regardless of input", () => {
    expect(isMemberOf([] as const, "red")).toBe(false);
  });

  it("narrows the value type when used as a type guard", () => {
    const value: unknown = "green";
    if (isMemberOf(tuple, value)) {
      // `value` is typed as `"red" | "green" | "blue"` here; the assignment
      // proves the narrowing happened (would fail to compile otherwise).
      const narrowed: (typeof tuple)[number] = value;
      expect(narrowed).toBe("green");
    } else {
      expect.fail("expected the guard to narrow");
    }
  });
});
