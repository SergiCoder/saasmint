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
  cancelAtPeriodEnd: false,
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
    it("maps active status to success badge", () => {
      render(<SubscriptionCard {...defaultProps} />);
      const badge = screen.getByText("Active");
      expect(badge.className).toContain("bg-green-50");
    });

    it("maps trialing status to info badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="trialing"
          statusLabel="Trial"
        />,
      );
      const badge = screen.getByText("Trial");
      expect(badge.className).toContain("bg-blue-50");
    });

    it("maps past_due status to warning badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="past_due"
          statusLabel="Past Due"
        />,
      );
      const badge = screen.getByText("Past Due");
      expect(badge.className).toContain("bg-yellow-50");
    });

    it("maps canceled status to error badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="canceled"
          statusLabel="Canceled"
        />,
      );
      const badge = screen.getByText("Canceled");
      expect(badge.className).toContain("bg-red-50");
    });

    it("maps unpaid status to error badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="unpaid"
          statusLabel="Unpaid"
        />,
      );
      const badge = screen.getByText("Unpaid");
      expect(badge.className).toContain("bg-red-50");
    });

    it("maps incomplete status to warning badge", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          status="incomplete"
          statusLabel="Incomplete"
        />,
      );
      const badge = screen.getByText("Incomplete");
      expect(badge.className).toContain("bg-yellow-50");
    });
  });

  describe("cancel at period end", () => {
    it("shows cancel label when cancelAtPeriodEnd is true and label provided", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          cancelAtPeriodEnd
          cancelLabel="Subscription will end on Jan 15, 2027"
        />,
      );
      expect(
        screen.getByText("Subscription will end on Jan 15, 2027"),
      ).toBeInTheDocument();
    });

    it("does not show cancel label when cancelAtPeriodEnd is false", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          cancelAtPeriodEnd={false}
          cancelLabel="Will end"
        />,
      );
      expect(screen.queryByText("Will end")).not.toBeInTheDocument();
    });

    it("does not show cancel label when cancelAtPeriodEnd is true but no label", () => {
      render(<SubscriptionCard {...defaultProps} cancelAtPeriodEnd />);
      // No yellow warning text should appear
      const { container } = render(
        <SubscriptionCard {...defaultProps} cancelAtPeriodEnd />,
      );
      const yellowText = container.querySelector(".text-yellow-700");
      expect(yellowText).not.toBeInTheDocument();
    });
  });

  describe("actions slot", () => {
    it("renders actions when provided", () => {
      render(
        <SubscriptionCard
          {...defaultProps}
          actions={<button>Cancel</button>}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });

    it("does not render actions container when no actions", () => {
      const { container } = render(<SubscriptionCard {...defaultProps} />);
      expect(
        container.querySelector(".mt-6.flex.gap-3"),
      ).not.toBeInTheDocument();
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
