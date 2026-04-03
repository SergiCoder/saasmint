import { describe, it, expect } from "vitest";
import {
  toSnakeCase,
  toCamelCase,
  keysToSnake,
  keysToCamel,
} from "@/infrastructure/api/caseTransform";

describe("toSnakeCase", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("fullName")).toBe("full_name");
  });

  it("handles multiple uppercase letters", () => {
    expect(toSnakeCase("preferredCurrency")).toBe("preferred_currency");
  });

  it("returns already-snake_case strings unchanged", () => {
    expect(toSnakeCase("full_name")).toBe("full_name");
  });

  it("returns single-word strings unchanged", () => {
    expect(toSnakeCase("email")).toBe("email");
  });
});

describe("toCamelCase", () => {
  it("converts snake_case to camelCase", () => {
    expect(toCamelCase("full_name")).toBe("fullName");
  });

  it("handles multiple underscores", () => {
    expect(toCamelCase("preferred_currency")).toBe("preferredCurrency");
  });

  it("returns already-camelCase strings unchanged", () => {
    expect(toCamelCase("fullName")).toBe("fullName");
  });

  it("returns single-word strings unchanged", () => {
    expect(toCamelCase("email")).toBe("email");
  });
});

describe("keysToSnake", () => {
  it("converts all object keys to snake_case", () => {
    const input = { fullName: "Alice", preferredLocale: "en" };
    expect(keysToSnake(input)).toEqual({
      full_name: "Alice",
      preferred_locale: "en",
    });
  });

  it("preserves values including null", () => {
    const input = { avatarUrl: null, phonePrefix: "+1" };
    expect(keysToSnake(input)).toEqual({
      avatar_url: null,
      phone_prefix: "+1",
    });
  });

  it("handles empty objects", () => {
    expect(keysToSnake({})).toEqual({});
  });
});

describe("keysToCamel", () => {
  it("converts all object keys to camelCase", () => {
    const input = { full_name: "Alice", preferred_locale: "en" };
    expect(keysToCamel(input)).toEqual({
      fullName: "Alice",
      preferredLocale: "en",
    });
  });

  it("preserves values including null", () => {
    const input = { avatar_url: null, phone_prefix: "+1" };
    expect(keysToCamel(input)).toEqual({
      avatarUrl: null,
      phonePrefix: "+1",
    });
  });

  it("handles empty objects", () => {
    expect(keysToCamel({})).toEqual({});
  });
});
