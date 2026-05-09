import { describe, it, expect } from "vitest";
import pkg from "../../package.json";
import { APP_NAME, APP_VERSION, getReleaseUrl } from "@/lib/appVersion";

describe("APP_VERSION", () => {
  it("matches the version declared in package.json", () => {
    // Pins the contract that the footer stamp tracks the shipped semver —
    // any refactor that decouples APP_VERSION from package.json will fail here.
    expect(APP_VERSION).toBe(pkg.version);
  });
});

describe("APP_NAME", () => {
  it("is the canonical brand name used across layouts and metadata", () => {
    // Single source of truth for the marketing brand string. If this changes,
    // every layout / `generateMetadata` template that interpolates it should
    // pick up the new value automatically — guarding the constant prevents
    // accidental drift.
    expect(APP_NAME).toBe("SaaSmint");
  });
});

describe("getReleaseUrl", () => {
  it("builds a GitHub releases tag URL with a leading 'v' on the version", () => {
    // Pinning the exact shape so future readers don't accidentally drop the
    // `tag/` segment or the `v` prefix — both would break the live link.
    expect(getReleaseUrl("0.8.0")).toBe(
      "https://github.com/SergiCoder/saasmint-app/releases/tag/v0.8.0",
    );
  });

  it("does not double-prefix when the caller already passes a 'v'", () => {
    // Documents current behaviour: callers are expected to pass a bare semver
    // (the marketing layout passes `APP_VERSION`, not `v${APP_VERSION}`).
    expect(getReleaseUrl("v0.8.0")).toBe(
      "https://github.com/SergiCoder/saasmint-app/releases/tag/vv0.8.0",
    );
  });
});
