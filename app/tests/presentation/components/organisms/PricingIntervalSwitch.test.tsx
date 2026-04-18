import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { PricingIntervalSwitch } from "@/presentation/components/organisms/PricingIntervalSwitch";

const baseProps = {
  ariaLabel: "Billing interval",
  monthlyLabel: "Monthly",
  yearlyLabel: "Yearly",
  header: <h2>Pricing</h2>,
  monthlyGrid: <div data-testid="monthly-grid">MONTHLY_GRID</div>,
  yearlyGrid: <div data-testid="yearly-grid">YEARLY_GRID</div>,
};

describe("PricingIntervalSwitch", () => {
  it("renders the header, both tabs, and both grids", () => {
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="month" />);

    expect(screen.getByRole("heading", { name: "Pricing" })).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: "Billing interval" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Monthly" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Yearly" })).toBeInTheDocument();
    // Both grids render, but only the active one is visible.
    expect(screen.getByTestId("monthly-grid")).toBeInTheDocument();
    expect(screen.getByTestId("yearly-grid")).toBeInTheDocument();
  });

  it("marks the default monthly tab as selected and hides the yearly grid", () => {
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="month" />);

    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Yearly" })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    expect(screen.getByTestId("monthly-grid").parentElement?.className).not.toContain(
      "hidden",
    );
    expect(screen.getByTestId("yearly-grid").parentElement?.className).toContain(
      "hidden",
    );
  });

  it("respects defaultInterval='year'", () => {
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="year" />);

    expect(screen.getByRole("tab", { name: "Yearly" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByTestId("monthly-grid").parentElement?.className).toContain(
      "hidden",
    );
    expect(screen.getByTestId("yearly-grid").parentElement?.className).not.toContain(
      "hidden",
    );
  });

  it("switches from monthly to yearly on tab click", async () => {
    const user = userEvent.setup();
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="month" />);

    await user.click(screen.getByRole("tab", { name: "Yearly" }));

    expect(screen.getByRole("tab", { name: "Yearly" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByTestId("yearly-grid").parentElement?.className).not.toContain(
      "hidden",
    );
    expect(screen.getByTestId("monthly-grid").parentElement?.className).toContain(
      "hidden",
    );
  });

  it("switches back from yearly to monthly on tab click", async () => {
    const user = userEvent.setup();
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="year" />);

    await user.click(screen.getByRole("tab", { name: "Monthly" }));

    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("monthly-grid").parentElement?.className).not.toContain(
      "hidden",
    );
    expect(screen.getByTestId("yearly-grid").parentElement?.className).toContain(
      "hidden",
    );
  });

  it("renders an optional savingsBadge slot when provided", () => {
    render(
      <PricingIntervalSwitch
        {...baseProps}
        defaultInterval="month"
        savingsBadge={<span>Save 20%</span>}
      />,
    );
    expect(screen.getByText("Save 20%")).toBeInTheDocument();
  });

  it("omits the savingsBadge slot when undefined", () => {
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="month" />);
    expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
  });

  it("applies selected/unselected styling to each tab", async () => {
    const user = userEvent.setup();
    render(<PricingIntervalSwitch {...baseProps} defaultInterval="month" />);

    const monthlyTab = screen.getByRole("tab", { name: "Monthly" });
    const yearlyTab = screen.getByRole("tab", { name: "Yearly" });

    expect(monthlyTab.className).toContain("bg-primary-600");
    expect(yearlyTab.className).not.toContain("bg-primary-600");

    await user.click(yearlyTab);

    expect(yearlyTab.className).toContain("bg-primary-600");
    expect(monthlyTab.className).not.toContain("bg-primary-600");
  });
});
