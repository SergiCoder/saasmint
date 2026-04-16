import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { PricingSection } from "@/presentation/components/organisms/PricingSection";
import type { PlanCardGroup } from "@/app/[locale]/_lib/buildPlanCards";

const groups: PlanCardGroup[] = [
  {
    key: "personal-basic",
    name: "Basic",
    description: "Basic plan",
    highlighted: false,
    context: "personal",
    tier: 2,
    monthly: {
      price: "$19",
      intervalLabel: "month",
      cta: <button>Subscribe Monthly</button>,
    },
    yearly: {
      price: "$190",
      intervalLabel: "year",
      priceSubLabel: "$15.83/month billed yearly",
      cta: <button>Subscribe Yearly</button>,
    },
    yearlySavingsPct: 17,
  },
];

const labels = { monthly: "Monthly", yearly: "Yearly" };

describe("PricingSection", () => {
  it("renders the section title and description", () => {
    render(
      <PricingSection
        title="Personal plans"
        description="For individuals."
        groups={groups}
        labels={labels}
      />,
    );
    expect(screen.getByText("Personal plans")).toBeInTheDocument();
    expect(screen.getByText("For individuals.")).toBeInTheDocument();
  });

  it("shows monthly variant by default and switches to yearly on toggle", async () => {
    const user = userEvent.setup();
    render(<PricingSection title="Personal" groups={groups} labels={labels} />);

    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe Monthly" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Yearly" }));

    expect(screen.getByText("$190")).toBeInTheDocument();
    expect(screen.getByText("$15.83/month billed yearly")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe Yearly" }),
    ).toBeInTheDocument();
  });

  it("displays the savings badge when provided", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        savingsBadge="Save up to 17%"
      />,
    );
    expect(screen.getByText("Save up to 17%")).toBeInTheDocument();
  });

  it("hides the savings badge when not provided", () => {
    render(<PricingSection title="Personal" groups={groups} labels={labels} />);
    expect(screen.queryByText(/save up to/i)).not.toBeInTheDocument();
  });

  it("respects defaultInterval='year'", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        defaultInterval="year"
      />,
    );
    expect(screen.getByText("$190")).toBeInTheDocument();
  });

  it("renders nothing when groups is empty", () => {
    const { container } = render(
      <PricingSection title="Personal" groups={[]} labels={labels} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
