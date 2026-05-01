import { describe, it, expect } from "vitest";
import { contextQuery } from "@/infrastructure/api/contextQuery";

describe("contextQuery", () => {
  it("returns '?context=personal' for 'personal'", () => {
    expect(contextQuery("personal")).toBe("?context=personal");
  });

  it("returns '?context=team' for 'team'", () => {
    expect(contextQuery("team")).toBe("?context=team");
  });

  it("returns an empty string when context is undefined", () => {
    expect(contextQuery(undefined)).toBe("");
  });

  it("returns an empty string for an unrecognised value (injection guard)", () => {
    // contextQuery must not emit arbitrary query strings — a tampered RPC
    // argument like "&other=injected" must be silently dropped.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(contextQuery("&other=injected" as any)).toBe("");
  });
});
