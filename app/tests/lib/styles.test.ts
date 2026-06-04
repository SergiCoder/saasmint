import { describe, it, expect } from "vitest";
import {
  SECONDARY_LINK_CLASS,
  GHOST_UNDERLINE_BUTTON_CLASS,
  BUTTON_BASE_CLASS,
  BUTTON_VARIANT_CLASSES,
  BUTTON_SIZE_CLASSES,
} from "@/lib/styles";

/**
 * These tests guard the shared style constants that `Button`, `LinkButton`,
 * `DangerZone`, and `CancelRenewalButton` import. A rename or structural
 * change to any constant will be caught here before the visual regression
 * surfaces in production.
 */

describe("BUTTON_VARIANT_CLASSES", () => {
  it("defines all four supported variants", () => {
    expect(BUTTON_VARIANT_CLASSES).toHaveProperty("primary");
    expect(BUTTON_VARIANT_CLASSES).toHaveProperty("secondary");
    expect(BUTTON_VARIANT_CLASSES).toHaveProperty("ghost");
    expect(BUTTON_VARIANT_CLASSES).toHaveProperty("danger");
  });

  it("primary variant contains brand teal colour class", () => {
    expect(BUTTON_VARIANT_CLASSES.primary).toContain("bg-primary-600");
    expect(BUTTON_VARIANT_CLASSES.primary).toContain("text-white");
  });

  it("secondary variant contains white background and border classes", () => {
    expect(BUTTON_VARIANT_CLASSES.secondary).toContain("bg-white");
    expect(BUTTON_VARIANT_CLASSES.secondary).toContain("border");
  });

  it("danger variant contains red background class", () => {
    expect(BUTTON_VARIANT_CLASSES.danger).toContain("bg-red-600");
    expect(BUTTON_VARIANT_CLASSES.danger).toContain("text-white");
  });
});

describe("BUTTON_SIZE_CLASSES", () => {
  it("defines sm, md, and lg sizes", () => {
    expect(BUTTON_SIZE_CLASSES).toHaveProperty("sm");
    expect(BUTTON_SIZE_CLASSES).toHaveProperty("md");
    expect(BUTTON_SIZE_CLASSES).toHaveProperty("lg");
  });

  it("each size class contains padding utilities", () => {
    for (const cls of Object.values(BUTTON_SIZE_CLASSES)) {
      // All sizes use px-* and py-* utilities.
      expect(cls).toMatch(/px-\d/);
      expect(cls).toMatch(/py-\d/);
    }
  });

  it("lg size uses larger padding than sm", () => {
    // Extract the first numeric part of the px-* class for a rough
    // ordering sanity check without hard-coding the exact token values.
    const smPx = Number(BUTTON_SIZE_CLASSES.sm.match(/px-(\d+)/)?.[1]);
    const lgPx = Number(BUTTON_SIZE_CLASSES.lg.match(/px-(\d+)/)?.[1]);
    expect(lgPx).toBeGreaterThan(smPx);
  });
});

describe("BUTTON_BASE_CLASS", () => {
  it("contains flex layout utility", () => {
    expect(BUTTON_BASE_CLASS).toContain("inline-flex");
  });

  it("contains rounded-md for consistent border radius", () => {
    expect(BUTTON_BASE_CLASS).toContain("rounded-md");
  });

  it("contains focus-visible ring utilities for keyboard accessibility", () => {
    expect(BUTTON_BASE_CLASS).toContain("focus-visible:ring-2");
  });

  it("contains transition-colors for hover feedback", () => {
    expect(BUTTON_BASE_CLASS).toContain("transition-colors");
  });
});

describe("SECONDARY_LINK_CLASS", () => {
  it("contains inline-flex for inline layout", () => {
    expect(SECONDARY_LINK_CLASS).toContain("inline-flex");
  });

  it("contains white background and border classes (secondary button visual)", () => {
    expect(SECONDARY_LINK_CLASS).toContain("bg-white");
    expect(SECONDARY_LINK_CLASS).toContain("border");
  });

  it("contains focus-visible ring for keyboard accessibility", () => {
    expect(SECONDARY_LINK_CLASS).toContain("focus-visible:ring-2");
  });
});

describe("GHOST_UNDERLINE_BUTTON_CLASS", () => {
  it("contains cursor-pointer so the element looks interactive", () => {
    expect(GHOST_UNDERLINE_BUTTON_CLASS).toContain("cursor-pointer");
  });

  it("contains muted gray text colour for low-emphasis visual", () => {
    expect(GHOST_UNDERLINE_BUTTON_CLASS).toContain("text-gray-500");
  });

  it("contains hover underline for interactive feedback", () => {
    expect(GHOST_UNDERLINE_BUTTON_CLASS).toContain("hover:underline");
  });
});
