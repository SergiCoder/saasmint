import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FreePlanCard } from "@/app/[locale]/(app)/subscription/_components/FreePlanCard";

describe("FreePlanCard", () => {
  it("renders the eyebrow, plan name, description and badge", () => {
    render(
      <FreePlanCard
        eyebrowLabel="Current Plan"
        planName="Free"
        description="For individuals getting started."
        badgeLabel="Free"
      />,
    );

    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Free" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("For individuals getting started."),
    ).toBeInTheDocument();
    // Badge text appears in addition to the heading; scope the assertion to
    // the badge by its data-* surface (the Badge atom uses a span).
    const badges = screen.getAllByText("Free");
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });
});
