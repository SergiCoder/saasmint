import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GetStartedButton } from "@/app/[locale]/(marketing)/pricing/_components/GetStartedButton";

describe("GetStartedButton", () => {
  it("renders a link to the signup page with the planPriceId in the query string", () => {
    render(
      <GetStartedButton planPriceId="price_123">Get started</GetStartedButton>,
    );
    const link = screen.getByRole("link", { name: "Get started" });
    expect(link).toHaveAttribute("href", "/signup?plan=price_123");
  });

  it("renders the children inside the link", () => {
    render(
      <GetStartedButton planPriceId="price_123">Get started</GetStartedButton>,
    );
    expect(
      screen.getByRole("link", { name: "Get started" }),
    ).toBeInTheDocument();
  });

  it("uses the primary variant when highlighted", () => {
    render(
      <GetStartedButton planPriceId="price_123" highlighted>
        Get started
      </GetStartedButton>,
    );
    const link = screen.getByRole("link", { name: "Get started" });
    expect(link.className).toMatch(/bg-primary|primary/);
  });

  it("uses the secondary variant by default", () => {
    render(
      <GetStartedButton planPriceId="price_123">Get started</GetStartedButton>,
    );
    const link = screen.getByRole("link", { name: "Get started" });
    expect(link.className).not.toMatch(/bg-primary-600/);
  });

  it("adds context=team to the query string when provided", () => {
    render(
      <GetStartedButton planPriceId="price_123" context="team">
        Get started
      </GetStartedButton>,
    );
    const link = screen.getByRole("link", { name: "Get started" });
    expect(link).toHaveAttribute("href", "/signup?plan=price_123&context=team");
  });
});
