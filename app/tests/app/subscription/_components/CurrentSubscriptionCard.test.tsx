import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Subscription } from "@/domain/models/Subscription";

// getTranslations echoes the key so the tests can assert on raw keys.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() =>
    Promise.resolve((key: string, values?: Record<string, unknown>) => {
      if (values) {
        return `${key}:${Object.entries(values)
          .map(([k, v]) => `${k}=${String(v)}`)
          .join(",")}`;
      }
      return key;
    }),
  ),
}));

// Replace sibling child components with simple stand-ins so we can verify
// they are (or aren't) rendered without pulling in their full client trees.
vi.mock(
  "@/app/[locale]/(app)/subscription/_components/BillingPortalButton",
  async () => {
    const React = await import("react");
    return {
      BillingPortalButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          "button",
          { type: "button", "data-testid": "billing-portal" },
          children,
        ),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/CancelRenewalButton",
  async () => {
    const React = await import("react");
    return {
      CancelRenewalButton: ({ label }: { label: string }) =>
        React.createElement(
          "button",
          { type: "button", "data-testid": "cancel-renewal" },
          label,
        ),
    };
  },
);

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/ResumeSubscriptionButton",
  async () => {
    const React = await import("react");
    return {
      ResumeSubscriptionButton: ({ children }: { children: React.ReactNode }) =>
        React.createElement(
          "button",
          { type: "button", "data-testid": "resume" },
          children,
        ),
    };
  },
);

// Render SubscriptionCard as a simple wrapper that surfaces the props we
// want to assert on.
vi.mock("@/presentation/components/organisms/SubscriptionCard", async () => {
  const React = await import("react");
  return {
    SubscriptionCard: (props: Record<string, unknown>) =>
      React.createElement(
        "div",
        { "data-testid": "subscription-card" },
        React.createElement(
          "span",
          { "data-testid": "plan-name" },
          String(props.planName ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "subtitle" },
          String(props.subtitle ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "period-end-iso" },
          String(props.currentPeriodEndIso ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "period-end-label" },
          String(props.periodEndLabel ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "cancel-at-period-end" },
          String(props.cancelAtPeriodEnd ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "cancel-label" },
          String(props.cancelLabel ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "footer" },
          String(props.footer ?? ""),
        ),
        React.createElement(
          "div",
          { "data-testid": "actions" },
          props.actions as React.ReactNode,
        ),
      ),
  };
});

import { CurrentSubscriptionCard } from "@/app/[locale]/(app)/subscription/_components/CurrentSubscriptionCard";

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub_1",
    status: "active",
    plan: {
      id: "plan_1",
      name: "Pro",
      description: "",
      context: "personal",
      tier: 3,
      interval: "month",
      price: null,
    },
    quantity: 1,
    trialEndsAt: null,
    currentPeriodStart: "2026-01-01T00:00:00Z",
    currentPeriodEnd: "2026-02-01T00:00:00Z",
    canceledAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

async function renderCard(
  props: React.ComponentProps<typeof CurrentSubscriptionCard>,
) {
  const jsx = await CurrentSubscriptionCard(props);
  return render(jsx as React.ReactElement);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CurrentSubscriptionCard", () => {
  it("renders planName and period-end details for an active personal monthly sub when canManage=true", async () => {
    await renderCard({
      subscription: makeSub(),
      locale: "en",
      planName: "Pro",
      canManage: true,
      teamOwnerName: null,
    });

    expect(screen.getByTestId("plan-name")).toHaveTextContent("Pro");
    // Personal sub: no seat label; monthly interval label only.
    expect(screen.getByTestId("subtitle")).toHaveTextContent("billedMonthly");
    expect(screen.getByTestId("period-end-iso")).toHaveTextContent(
      "2026-02-01T00:00:00.000Z",
    );
    expect(screen.getByTestId("period-end-label")).toHaveTextContent(
      "renewsOn",
    );
    expect(screen.getByTestId("cancel-at-period-end")).toHaveTextContent(
      "false",
    );
    // BillingPortal + CancelRenewal rendered inside actions.
    expect(screen.getByTestId("billing-portal")).toBeInTheDocument();
    expect(screen.getByTestId("cancel-renewal")).toBeInTheDocument();
    expect(screen.queryByTestId("resume")).not.toBeInTheDocument();
  });

  it("renders the Resume button instead of Cancel when the sub is canceling", async () => {
    await renderCard({
      subscription: makeSub({ canceledAt: "2026-01-15T00:00:00Z" }),
      locale: "en",
      planName: "Pro",
      canManage: true,
      teamOwnerName: null,
    });

    expect(screen.getByTestId("cancel-at-period-end")).toHaveTextContent(
      "true",
    );
    expect(screen.getByTestId("period-end-label")).toHaveTextContent("endsOn");
    expect(screen.getByTestId("resume")).toBeInTheDocument();
    expect(screen.queryByTestId("cancel-renewal")).not.toBeInTheDocument();
  });

  it("omits period-end details when currentPeriodEnd is an unparseable string", async () => {
    await renderCard({
      subscription: makeSub({ currentPeriodEnd: "not-a-date" }),
      locale: "en",
      planName: "Free",
      canManage: true,
      teamOwnerName: null,
    });

    expect(screen.getByTestId("period-end-iso")).toHaveTextContent("");
    expect(screen.getByTestId("period-end-label")).toHaveTextContent("");
  });

  it("renders seats label and yearly interval for a team yearly subscription with quantity > 1", async () => {
    await renderCard({
      subscription: makeSub({
        plan: {
          id: "plan_team",
          name: "Team Pro",
          description: "",
          context: "team",
          tier: 3,
          interval: "year",
          price: null,
        },
        quantity: 5,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: true,
      teamOwnerName: "Alice",
    });

    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "5 seats · billedYearly",
    );
  });

  it("uses the singular seat label when team quantity is 1", async () => {
    await renderCard({
      subscription: makeSub({
        plan: {
          id: "plan_team",
          name: "Team Pro",
          description: "",
          context: "team",
          tier: 3,
          interval: "month",
          price: null,
        },
        quantity: 1,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: true,
      teamOwnerName: "Alice",
    });

    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      "1 seat · billedMonthly",
    );
  });

  it("hides management actions and shows managedBy footer for team sub when the caller can't manage", async () => {
    await renderCard({
      subscription: makeSub({
        plan: {
          id: "plan_team",
          name: "Team Pro",
          description: "",
          context: "team",
          tier: 3,
          interval: "month",
          price: null,
        },
        quantity: 3,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: false,
      teamOwnerName: "Alice",
    });

    expect(screen.getByTestId("footer")).toHaveTextContent(
      "managedBy:name=Alice",
    );
    expect(screen.queryByTestId("billing-portal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cancel-renewal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resume")).not.toBeInTheDocument();
  });

  it("omits the managedBy footer when teamOwnerName is null", async () => {
    await renderCard({
      subscription: makeSub({
        plan: {
          id: "plan_team",
          name: "Team Pro",
          description: "",
          context: "team",
          tier: 3,
          interval: "month",
          price: null,
        },
        quantity: 3,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: false,
      teamOwnerName: null,
    });

    expect(screen.getByTestId("footer")).toHaveTextContent("");
  });

  it("shows no actions for a personal sub the caller can't manage", async () => {
    await renderCard({
      subscription: makeSub(),
      locale: "en",
      planName: "Pro",
      canManage: false,
      teamOwnerName: null,
    });

    expect(screen.queryByTestId("billing-portal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cancel-renewal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resume")).not.toBeInTheDocument();
    // Personal + !canManage => no footer either.
    expect(screen.getByTestId("footer")).toHaveTextContent("");
  });
});
