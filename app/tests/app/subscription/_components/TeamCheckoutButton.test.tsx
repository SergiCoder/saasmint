import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { TeamCheckoutButton } from "@/app/[locale]/(app)/subscription/_components/TeamCheckoutButton";

const defaultProps = {
  planPriceId: "price_team_1",
  children: "Buy team",
};

describe("TeamCheckoutButton", () => {
  it("renders a link to the team checkout page with the plan price ID", () => {
    render(<TeamCheckoutButton {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Buy team" });
    expect(link).toHaveAttribute(
      "href",
      "/subscription/team-checkout?plan=price_team_1",
    );
  });

  it("uses the primary variant when highlighted", () => {
    render(<TeamCheckoutButton {...defaultProps} highlighted />);
    const link = screen.getByRole("link", { name: "Buy team" });
    expect(link.className).toMatch(/bg-primary/);
  });

  it("uses the secondary variant by default", () => {
    render(<TeamCheckoutButton {...defaultProps} />);
    const link = screen.getByRole("link", { name: "Buy team" });
    expect(link.className).not.toMatch(/bg-primary-600/);
  });
});
