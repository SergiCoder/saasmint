import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { GetStartedButton } from "@/app/[locale]/(marketing)/pricing/_components/GetStartedButton";

describe("GetStartedButton", () => {
  it("renders a link to the signup page with the planPriceId in the query string", () => {
    render(
      <GetStartedButton planPriceId="price_123">Get started</GetStartedButton>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/signup?plan=price_123");
  });

  it("renders the children inside the button", () => {
    render(
      <GetStartedButton planPriceId="price_123">Get started</GetStartedButton>,
    );
    expect(
      screen.getByRole("button", { name: "Get started" }),
    ).toBeInTheDocument();
  });

  it("uses the primary variant when highlighted", () => {
    render(
      <GetStartedButton planPriceId="price_123" highlighted>
        Get started
      </GetStartedButton>,
    );
    const button = screen.getByRole("button", { name: "Get started" });
    expect(button.className).toMatch(/bg-primary|primary/);
  });

  it("uses the secondary variant by default", () => {
    render(
      <GetStartedButton planPriceId="price_123">Get started</GetStartedButton>,
    );
    const button = screen.getByRole("button", { name: "Get started" });
    expect(button.className).not.toMatch(/bg-primary-600/);
  });
});
