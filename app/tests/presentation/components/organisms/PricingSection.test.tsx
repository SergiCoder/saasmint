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
const hrefs = {
  monthlyHref: "/pricing?interval=month",
  yearlyHref: "/pricing?interval=year",
} as const;

describe("PricingSection", () => {
  it("renders the section title and description", () => {
    render(
      <PricingSection
        title="Personal plans"
        description="For individuals."
        groups={groups}
        labels={labels}
        selectedInterval="month"
        {...hrefs}
      />,
    );
    expect(screen.getByText("Personal plans")).toBeInTheDocument();
    expect(screen.getByText("For individuals.")).toBeInTheDocument();
  });

  it("renders only the monthly variant when selectedInterval='month'", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        selectedInterval="month"
        {...hrefs}
      />,
    );

    expect(screen.getByText("$19")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe Monthly" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("$190")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Subscribe Yearly" }),
    ).not.toBeInTheDocument();
  });

  it("renders only the yearly variant when selectedInterval='year'", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        selectedInterval="year"
        {...hrefs}
      />,
    );

    expect(screen.getByText("$190")).toBeInTheDocument();
    expect(screen.getByText("$15.83/month billed yearly")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Subscribe Yearly" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("$19")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Subscribe Monthly" }),
    ).not.toBeInTheDocument();
  });

  it("displays the savings badge when provided", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        savingsBadge="Save up to 17%"
        selectedInterval="month"
        {...hrefs}
      />,
    );
    expect(screen.getByText("Save up to 17%")).toBeInTheDocument();
  });

  it("hides the savings badge when not provided", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        selectedInterval="month"
        {...hrefs}
      />,
    );
    expect(screen.queryByText(/save up to/i)).not.toBeInTheDocument();
  });

  it("points the tabs at the provided hrefs", () => {
    render(
      <PricingSection
        title="Personal"
        groups={groups}
        labels={labels}
        selectedInterval="month"
        {...hrefs}
      />,
    );
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute(
      "href",
      "/pricing?interval=month",
    );
    expect(screen.getByRole("tab", { name: "Yearly" })).toHaveAttribute(
      "href",
      "/pricing?interval=year",
    );
  });

  it("renders nothing when groups is empty", () => {
    const { container } = render(
      <PricingSection
        title="Personal"
        groups={[]}
        labels={labels}
        selectedInterval="month"
        {...hrefs}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
