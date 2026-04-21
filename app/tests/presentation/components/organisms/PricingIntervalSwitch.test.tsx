import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
      [k: string]: unknown;
    }) => React.createElement("a", { href, ...rest }, children),
  };
});

import { PricingIntervalSwitch } from "@/presentation/components/organisms/PricingIntervalSwitch";

const baseProps = {
  ariaLabel: "Billing interval",
  monthlyLabel: "Monthly",
  yearlyLabel: "Yearly",
  monthlyHref: "/pricing?interval=month",
  yearlyHref: "/pricing?interval=year",
  header: <h2>Pricing</h2>,
  grid: <div data-testid="active-grid">ACTIVE_GRID</div>,
};

describe("PricingIntervalSwitch", () => {
  it("renders the header, both tabs as links, and the active grid", () => {
    render(
      <PricingIntervalSwitch {...baseProps} selectedInterval="month" />,
    );

    expect(
      screen.getByRole("heading", { name: "Pricing" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: "Billing interval" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Monthly" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Yearly" })).toBeInTheDocument();
    expect(screen.getByTestId("active-grid")).toBeInTheDocument();
  });

  it("marks the selected month tab and points the other at yearlyHref", () => {
    render(
      <PricingIntervalSwitch {...baseProps} selectedInterval="month" />,
    );

    const monthlyTab = screen.getByRole("tab", { name: "Monthly" });
    const yearlyTab = screen.getByRole("tab", { name: "Yearly" });

    expect(monthlyTab).toHaveAttribute("aria-selected", "true");
    expect(yearlyTab).toHaveAttribute("aria-selected", "false");
    expect(monthlyTab).toHaveAttribute("href", "/pricing?interval=month");
    expect(yearlyTab).toHaveAttribute("href", "/pricing?interval=year");
  });

  it("marks the selected year tab when selectedInterval='year'", () => {
    render(
      <PricingIntervalSwitch {...baseProps} selectedInterval="year" />,
    );

    expect(screen.getByRole("tab", { name: "Yearly" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("renders an optional savingsBadge slot when provided", () => {
    render(
      <PricingIntervalSwitch
        {...baseProps}
        selectedInterval="month"
        savingsBadge={<span>Save 20%</span>}
      />,
    );
    expect(screen.getByText("Save 20%")).toBeInTheDocument();
  });

  it("omits the savingsBadge slot when undefined", () => {
    render(
      <PricingIntervalSwitch {...baseProps} selectedInterval="month" />,
    );
    expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
  });

  it("applies selected/unselected styling based on selectedInterval", () => {
    render(
      <PricingIntervalSwitch {...baseProps} selectedInterval="year" />,
    );

    const monthlyTab = screen.getByRole("tab", { name: "Monthly" });
    const yearlyTab = screen.getByRole("tab", { name: "Yearly" });

    expect(yearlyTab.className).toContain("bg-primary-600");
    expect(monthlyTab.className).not.toContain("bg-primary-600");
  });
});
