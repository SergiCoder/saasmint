import { describe, it, expect } from "vitest";
import { APP_NAME } from "@/lib/appVersion";

describe("APP_NAME", () => {
  it("is the canonical brand name used across layouts and metadata", () => {
    // Single source of truth for the marketing brand string. If this changes,
    // every layout / `generateMetadata` template that interpolates it should
    // pick up the new value automatically — guarding the constant prevents
    // accidental drift.
    expect(APP_NAME).toBe("SaaSmint");
  });
});
