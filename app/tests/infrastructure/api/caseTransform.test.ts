import { describe, it, expect } from "vitest";
import {
  toSnakeCase,
  toCamelCase,
  keysToSnake,
  keysToCamel,
  keysToCamelWithPrice,
  flattenPhone,
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

  it("recursively camelises nested plain objects", () => {
    const input = {
      outer_key: {
        inner_key: "value",
        deeper_nest: { deepest_field: 1 },
      },
    };
    expect(keysToCamel(input)).toEqual({
      outerKey: {
        innerKey: "value",
        deeperNest: { deepestField: 1 },
      },
    });
  });

  it("maps arrays of plain objects, camelising each entry", () => {
    const input = {
      nested_list: [{ first_name: "Alice" }, { first_name: "Bob" }],
    };
    expect(keysToCamel(input)).toEqual({
      nestedList: [{ firstName: "Alice" }, { firstName: "Bob" }],
    });
  });

  it("returns the same primitive when the top-level value is not an object", () => {
    expect(keysToCamel(42)).toBe(42);
    expect(keysToCamel("hello_world")).toBe("hello_world");
    expect(keysToCamel(null)).toBe(null);
    expect(keysToCamel(undefined)).toBe(undefined);
    expect(keysToCamel(true)).toBe(true);
  });

  it("maps a top-level array of primitives", () => {
    expect(keysToCamel([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("preserves Date instances (non-plain objects) untouched", () => {
    const date = new Date("2024-01-01T00:00:00Z");
    const result = keysToCamel({ created_at: date }) as {
      createdAt: Date;
    };
    expect(result.createdAt).toBe(date);
  });

  it("preserves Map instances untouched", () => {
    const map = new Map([["a", 1]]);
    const result = keysToCamel({ some_map: map }) as {
      someMap: Map<string, number>;
    };
    expect(result.someMap).toBe(map);
  });

  it("preserves class instances untouched", () => {
    class Foo {
      constructor(public snake_field: string) {}
    }
    const foo = new Foo("x");
    const result = keysToCamel({ my_foo: foo }) as { myFoo: Foo };
    expect(result.myFoo).toBe(foo);
  });
});

describe("keysToCamelWithPrice", () => {
  it("converts top-level keys and nested price keys to camelCase", () => {
    const input = {
      id: "p1",
      plan_name: "Pro",
      price: { id: "pp1", display_amount: 1900, currency: "eur" },
    };
    expect(keysToCamelWithPrice(input)).toEqual({
      id: "p1",
      planName: "Pro",
      price: { id: "pp1", displayAmount: 1900, currency: "eur" },
    });
  });

  it("derives displayAmount from amount when missing", () => {
    const input = {
      id: "p1",
      price: { id: "pp1", amount: 1900 },
    };
    expect(keysToCamelWithPrice(input)).toEqual({
      id: "p1",
      price: { id: "pp1", amount: 1900, displayAmount: 19, currency: "usd" },
    });
  });

  it("does not override existing displayAmount", () => {
    const input = {
      id: "p1",
      price: { id: "pp1", amount: 1900, display_amount: 19.0, currency: "eur" },
    };
    expect(keysToCamelWithPrice(input)).toEqual({
      id: "p1",
      price: { id: "pp1", amount: 1900, displayAmount: 19.0, currency: "eur" },
    });
  });

  it("uses fallbackCurrency when currency is missing", () => {
    const input = {
      id: "p1",
      price: { id: "pp1", amount: 1700 },
    };
    expect(keysToCamelWithPrice(input, "eur")).toEqual({
      id: "p1",
      price: { id: "pp1", amount: 1700, displayAmount: 17, currency: "eur" },
    });
  });

  it("leaves top-level keys converted when price is absent", () => {
    const input = { plan_name: "Free", some_field: "val" };
    expect(keysToCamelWithPrice(input)).toEqual({
      planName: "Free",
      someField: "val",
    });
  });

  it("skips price conversion when price is not an object", () => {
    const input = { plan_name: "Free", price: null };
    expect(keysToCamelWithPrice(input)).toEqual({
      planName: "Free",
      price: null,
    });
  });

  it("does not derive displayAmount when amount is not a number", () => {
    const input = {
      id: "p1",
      price: { id: "pp1", amount: "1900", currency: "eur" },
    };
    expect(keysToCamelWithPrice(input)).toEqual({
      id: "p1",
      price: { id: "pp1", amount: "1900", currency: "eur" },
    });
  });
});

describe("flattenPhone", () => {
  it("flattens a nested phone object into phonePrefix and phone fields", () => {
    const raw = { phone: { prefix: "+34", number: "612345678" } };
    const user = { id: "u1" };

    flattenPhone(raw, user);

    expect(user).toMatchObject({
      id: "u1",
      phonePrefix: "+34",
      phone: "612345678",
    });
  });

  it("sets both fields to null when phone is null", () => {
    const raw = { phone: null };
    const user: Record<string, unknown> = {};

    flattenPhone(raw, user);

    expect(user).toEqual({ phonePrefix: null, phone: null });
  });

  it("sets both fields to null when phone is undefined", () => {
    const raw: Record<string, unknown> = {};
    const user: Record<string, unknown> = {};

    flattenPhone(raw, user);

    expect(user).toEqual({ phonePrefix: null, phone: null });
  });

  it("overrides any pre-existing phone fields on the target", () => {
    const raw = { phone: { prefix: "+1", number: "5550100" } };
    const user: Record<string, unknown> = {
      phonePrefix: "+999",
      phone: "000",
    };

    flattenPhone(raw, user);

    expect(user).toMatchObject({ phonePrefix: "+1", phone: "5550100" });
  });
});
