import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SubscriptionCard } from "@/presentation/components/organisms";

const defaultProps = {
  planName: "Pro Plan",
  status: "active" as const,
  statusLabel: "Active",
  subtitle: "Billed monthly",
  currentPeriodEndIso: "2027-01-15T00:00:00.000Z",
  periodEndLocale: "en-US",
  periodEndLabel: "Renews on",
};

describe("SubscriptionCard", () => {
  it("renders plan name and subtitle", () => {
    render(<SubscriptionCard {...defaultProps} />);
    expect(screen.getByText("Pro Plan")).toBeInTheDocument();
    expect(screen.getByText("Billed monthly")).toBeInTheDocument();
  });

  it("renders the renewal date label and a date value", () => {
    render(<SubscriptionCard {...defaultProps} />);
    expect(screen.getByText("Renews on")).toBeInTheDocument();
    // FormattedDate renders the date via Intl.DateTimeFormat once mounted;
    // jsdom defaults to en-US, so "medium" style yields "Jan 15, 2027".
    expect(screen.getByText("Jan 15, 2027")).toBeInTheDocument();
  });

  describe("status badge variants", () => {
    it("hides the badge entirely when status is active (routine state)", () => {
      render(<SubscriptionCard {...defaultProps} />);
      expect(screen.queryByText("Active")).not.toBeInTheDocument();
    });

    it("maps trialing status to info badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="trialing"
          statusLabel="Trial"
        />,
      );
      expect(screen.getByText("Trial").className).toContain("bg-blue-50");
    });

    it("maps past_due status to warning badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="past_due"
          statusLabel="Past Due"
        />,
      );
      expect(screen.getByText("Past Due").className).toContain("bg-yellow-50");
    });

    it("maps canceled status to error badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="canceled"
          statusLabel="Canceled"
        />,
      );
      expect(screen.getByText("Canceled").className).toContain("bg-red-50");
    });

    it("maps unpaid status to error badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="unpaid"
          statusLabel="Unpaid"
        />,
      );
      expect(screen.getByText("Unpaid").className).toContain("bg-red-50");
    });

    it("maps incomplete status to warning badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="incomplete"
          statusLabel="Incomplete"
        />,
      );
      expect(screen.getByText("Incomplete").className).toContain(
        "bg-yellow-50",
      );
    });
  });

  describe("slots", () => {
    it("renders headerAction next to the badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          headerAction={<button>Manage billing</button>}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Manage billing" }),
      ).toBeInTheDocument();
    });

    it("renders dateAction inline with the date row", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          dateAction={<button>Cancel renewal</button>}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Cancel renewal" }),
      ).toBeInTheDocument();
    });

    it("renders banner content when provided", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          banner={<div role="alert">Scheduled change</div>}
        />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent("Scheduled change");
    });

    it("renders footer text when provided", () => {
      render(<SubscriptionCard {...defaultProps} footer="Managed by Alice" />);
      expect(screen.getByText("Managed by Alice")).toBeInTheDocument();
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <SubscriptionCard {...defaultProps} className="max-w-lg" />,
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("max-w-lg");
  });
});
