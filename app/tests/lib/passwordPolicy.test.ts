import { describe, it, expect } from "vitest";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

describe("PASSWORD_MIN_LENGTH", () => {
  it("is a positive integer", () => {
    expect(typeof PASSWORD_MIN_LENGTH).toBe("number");
    expect(Number.isInteger(PASSWORD_MIN_LENGTH)).toBe(true);
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThan(0);
  });

  it("equals 10 — must stay in sync with Django MinimumLengthValidator in saasmint-core", () => {
    // This value is contractually shared with the Django backend's
    // MinimumLengthValidator. Changing it here without updating the backend
    // (or vice-versa) would cause silent server-side rejection of passwords
    // that the UI considers valid.
    expect(PASSWORD_MIN_LENGTH).toBe(10);
  });
});
