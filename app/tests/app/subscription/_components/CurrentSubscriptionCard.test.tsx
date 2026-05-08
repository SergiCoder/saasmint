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

vi.mock(
  "@/app/[locale]/(app)/subscription/_components/BillingActionButton",
  async () => {
    const React = await import("react");
    return {
      BillingActionButton: ({
        children,
        action,
        context,
      }: {
        children: React.ReactNode;
        action: (context?: "personal" | "team") => Promise<unknown>;
        context?: "personal" | "team";
      }) =>
        React.createElement(
          "button",
          {
            type: "button",
            "data-testid":
              action.name === "resumeSubscription"
                ? "resume"
                : "release-scheduled-change",
            "data-context": context ?? "",
          },
          children,
        ),
    };
  },
);

vi.mock("@/app/actions/billing", () => ({
  resumeSubscription: Object.defineProperty(vi.fn(), "name", {
    value: "resumeSubscription",
  }),
  releaseScheduledChange: Object.defineProperty(vi.fn(), "name", {
    value: "releaseScheduledChange",
  }),
}));

vi.mock("@/presentation/components/molecules/AlertBanner", async () => {
  const React = await import("react");
  return {
    AlertBanner: ({
      children,
      variant,
    }: {
      children: React.ReactNode;
      variant?: string;
    }) =>
      React.createElement(
        "div",
        { "data-testid": "alert-banner", "data-variant": variant ?? "" },
        children,
      ),
  };
});

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
      CancelRenewalButton: ({
        label,
        confirmTitle,
        confirmBody,
        confirmAction,
        context,
      }: {
        label: string;
        confirmTitle: string;
        confirmBody: string;
        confirmAction: string;
        context?: "personal" | "team";
      }) =>
        React.createElement(
          "button",
          {
            type: "button",
            "data-testid": "cancel-renewal",
            "data-confirm-title": confirmTitle,
            "data-confirm-body": confirmBody,
            "data-confirm-action": confirmAction,
            "data-context": context ?? "",
          },
          label,
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
          { "data-testid": "eyebrow-label" },
          String(props.eyebrowLabel ?? ""),
        ),
        React.createElement(
          "span",
          { "data-testid": "plan-name" },
          String(props.planName ?? ""),
        ),
        React.createElement(
          "div",
          { "data-testid": "subtitle" },
          props.subtitle as React.ReactNode,
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
          "div",
          { "data-testid": "header-action" },
          props.headerAction as React.ReactNode,
        ),
        React.createElement(
          "div",
          { "data-testid": "date-action" },
          props.dateAction as React.ReactNode,
        ),
        React.createElement(
          "span",
          { "data-testid": "footer" },
          String(props.footer ?? ""),
        ),
        React.createElement(
          "div",
          { "data-testid": "banner" },
          props.banner as React.ReactNode,
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
    seatLimit: 1,
    seatsUsed: 1,
    trialEndsAt: null,
    currentPeriodStart: "2026-01-01T00:00:00Z",
    currentPeriodEnd: "2026-02-01T00:00:00Z",
    cancelAt: null,
    canceledAt: null,
    scheduledPlan: null,
    scheduledChangeAt: null,
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
    // BillingPortal goes in headerAction, CancelRenewal in dateAction.
    expect(screen.getByTestId("billing-portal")).toBeInTheDocument();
    expect(screen.getByTestId("cancel-renewal")).toBeInTheDocument();
    expect(screen.queryByTestId("resume")).not.toBeInTheDocument();
  });

  it("renders the Resume button and 'Cancels on' for an active sub scheduled to cancel", async () => {
    // Backend mirrors Stripe's `cancel_at` (Dahlia field): set the moment the
    // user clicks cancel-renewal, cleared on resume. While `status === "active"`
    // and `cancelAt !== null` we render the cancel-date row, the cancellation
    // notice, and the Resume action — `canceledAt` only flips when the sub
    // has actually ended.
    await renderCard({
      subscription: makeSub({ cancelAt: "2026-02-01T00:00:00Z" }),
      locale: "en",
      planName: "Pro",
      canManage: true,
      teamOwnerName: null,
    });

    // Date row is suppressed — the cancel banner's headline already states
    // "Cancels on {date}", so the date row would just repeat it.
    expect(screen.getByTestId("period-end-iso")).toHaveTextContent("");
    expect(screen.getByTestId("period-end-label")).toHaveTextContent("");
    // Resume lives inside the cancel banner; cancel-renewal disappears.
    expect(screen.getByTestId("resume")).toBeInTheDocument();
    expect(screen.queryByTestId("cancel-renewal")).not.toBeInTheDocument();
    expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
  });

  it("renders 'Ends on' with the canceledAt date and no manage actions for a fully-canceled sub", async () => {
    // Once the sub has actually ended (status === "canceled"), Resume is no
    // longer valid (Stripe rejects it on a closed sub) and Cancel-renewal is
    // moot. The card just shows when it ended.
    await renderCard({
      subscription: makeSub({
        status: "canceled",
        cancelAt: null,
        canceledAt: "2026-02-01T00:00:00Z",
      }),
      locale: "en",
      planName: "Pro",
      canManage: true,
      teamOwnerName: null,
    });

    expect(screen.getByTestId("period-end-iso")).toHaveTextContent(
      "2026-02-01T00:00:00.000Z",
    );
    expect(screen.getByTestId("period-end-label")).toHaveTextContent("endsOn");
    expect(screen.queryByTestId("resume")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cancel-renewal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("billing-portal")).not.toBeInTheDocument();
  });

  it("uses cancelAt (not currentPeriodEnd) in the cancel banner when both differ", async () => {
    // Stripe Dahlia ships `cancel_at` independently of `current_period_end`.
    // The cancel banner quotes the actual scheduled cutover (`cancelAt`),
    // not the period-end proxy the old heuristic relied on. The date row
    // itself is suppressed in this state — the banner owns the cutover date.
    await renderCard({
      subscription: makeSub({
        cancelAt: "2026-03-15T00:00:00Z",
        currentPeriodEnd: "2026-04-01T00:00:00Z",
      }),
      locale: "en",
      planName: "Pro",
      canManage: true,
      teamOwnerName: null,
    });

    // Banner headline interpolates the locale-formatted cancelAt date
    // (March 15, 2026 in en), not the currentPeriodEnd (April 1, 2026).
    const banner = screen.getByTestId("alert-banner").textContent ?? "";
    expect(banner).toMatch(/March 15, 2026/);
    expect(banner).not.toMatch(/April 1, 2026/);
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
        seatLimit: 5,
        seatsUsed: 1,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: true,
      teamOwnerName: "Alice",
    });

    // i18n stub echoes "seatsOfMax:count=N,max=M" — count = seatsUsed,
    // max = seatLimit (both backend-driven).
    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      /seatsOfMax:count=1,max=5\s*·\s*billedYearly/,
    );
  });

  it("renders the seats-of-max label even when team quantity is 1", async () => {
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
        seatLimit: 1,
        seatsUsed: 1,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: true,
      teamOwnerName: "Alice",
    });

    expect(screen.getByTestId("subtitle")).toHaveTextContent(
      /seatsOfMax:count=1,max=1\s*·\s*billedMonthly/,
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
        seatLimit: 3,
        seatsUsed: 1,
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
        seatLimit: 3,
        seatsUsed: 1,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: false,
      teamOwnerName: null,
    });

    expect(screen.getByTestId("footer")).toHaveTextContent("");
  });

  it("uses team-flavored cancel copy with org-archival warning when an owner cancels a team sub", async () => {
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
        seatLimit: 3,
        seatsUsed: 1,
      }),
      locale: "en",
      planName: "Team Pro",
      canManage: true,
      teamOwnerName: "Alice",
    });

    const cancelButton = screen.getByTestId("cancel-renewal");
    expect(cancelButton).toHaveTextContent("cancelRenewal");
    expect(cancelButton).toHaveAttribute(
      "data-confirm-title",
      "cancelRenewalTeamTitle",
    );
    expect(cancelButton.getAttribute("data-confirm-body")).toContain(
      "cancelRenewalTeamBody",
    );
    expect(cancelButton).toHaveAttribute(
      "data-confirm-action",
      "cancelRenewalTeam",
    );
  });

  it("uses standard personal cancel copy for a personal sub", async () => {
    await renderCard({
      subscription: makeSub(),
      locale: "en",
      planName: "Pro",
      canManage: true,
      teamOwnerName: null,
    });

    const cancelButton = screen.getByTestId("cancel-renewal");
    expect(cancelButton).toHaveAttribute(
      "data-confirm-title",
      "cancelRenewalTitle",
    );
    expect(cancelButton.getAttribute("data-confirm-body")).toContain(
      "cancelRenewalBody",
    );
    expect(cancelButton).toHaveAttribute(
      "data-confirm-action",
      "cancelRenewal",
    );
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

  describe("isConcurrent (rule 5 — concurrent personal+team billing)", () => {
    it("uses the personal eyebrow even when not concurrent", async () => {
      await renderCard({
        subscription: makeSub(),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      expect(screen.getByTestId("eyebrow-label")).toHaveTextContent(
        "currentPersonalPlan",
      );
    });

    it("uses the currentPersonalPlan eyebrow for the personal card when concurrent", async () => {
      await renderCard({
        subscription: makeSub(),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
        isConcurrent: true,
      });

      expect(screen.getByTestId("eyebrow-label")).toHaveTextContent(
        "currentPersonalPlan",
      );
    });

    it("uses the currentTeamPlan eyebrow for the team card when concurrent", async () => {
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
          seatLimit: 3,
          seatsUsed: 1,
        }),
        locale: "en",
        planName: "Team Pro",
        canManage: true,
        teamOwnerName: "Alice",
        isConcurrent: true,
      });

      expect(screen.getByTestId("eyebrow-label")).toHaveTextContent(
        "currentTeamPlan",
      );
    });

    it("pins context=personal on the cancel button for the personal card when concurrent", async () => {
      await renderCard({
        subscription: makeSub(),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
        isConcurrent: true,
      });

      expect(screen.getByTestId("cancel-renewal")).toHaveAttribute(
        "data-context",
        "personal",
      );
    });

    it("pins context=team on the cancel button for the team card when concurrent", async () => {
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
          seatLimit: 3,
          seatsUsed: 1,
        }),
        locale: "en",
        planName: "Team Pro",
        canManage: true,
        teamOwnerName: "Alice",
        isConcurrent: true,
      });

      expect(screen.getByTestId("cancel-renewal")).toHaveAttribute(
        "data-context",
        "team",
      );
    });

    it("pins context on the resume button when concurrent and scheduled to cancel", async () => {
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
          cancelAt: "2026-01-15T00:00:00Z",
        }),
        locale: "en",
        planName: "Team Pro",
        canManage: true,
        teamOwnerName: null,
        isConcurrent: true,
      });

      expect(screen.getByTestId("resume")).toHaveAttribute(
        "data-context",
        "team",
      );
    });

    it("leaves context unset on cancel/resume buttons when not concurrent (single-sub default)", async () => {
      await renderCard({
        subscription: makeSub(),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      expect(screen.getByTestId("cancel-renewal")).toHaveAttribute(
        "data-context",
        "",
      );
    });
  });

  describe("scheduled downgrade banner", () => {
    const scheduledPlan = {
      id: "plan_basic",
      name: "Basic",
      description: "",
      context: "personal" as const,
      tier: 2 as const,
      interval: "month" as const,
      price: null,
    };

    it("renders the downgrade banner when scheduledPlan is set and canManage=true", async () => {
      await renderCard({
        subscription: makeSub({
          scheduledPlan,
          scheduledChangeAt: "2026-03-01T00:00:00Z",
        }),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
      expect(
        screen.getByTestId("release-scheduled-change"),
      ).toBeInTheDocument();
    });

    it("includes the scheduled plan name and date in the banner headline", async () => {
      await renderCard({
        subscription: makeSub({
          scheduledPlan,
          scheduledChangeAt: "2026-03-01T00:00:00Z",
        }),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      // The i18n stub echoes key:param=value for interpolated strings.
      const banner = screen.getByTestId("alert-banner");
      expect(banner.textContent).toContain("scheduledDowngradeHeadline");
      expect(banner.textContent).toContain("scheduledDowngradeBody");
    });

    it("renders the cancel banner instead of the downgrade banner when both are set (cancel takes priority)", async () => {
      await renderCard({
        subscription: makeSub({
          scheduledPlan,
          scheduledChangeAt: "2026-03-01T00:00:00Z",
          cancelAt: "2026-02-01T00:00:00Z",
        }),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      // The cancel banner is rendered (yellow/warning) and owns the Resume
      // action — the downgrade banner's release-button is suppressed.
      expect(screen.getByTestId("alert-banner")).toBeInTheDocument();
      expect(
        screen.queryByTestId("release-scheduled-change"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("resume")).toBeInTheDocument();
    });

    it("does NOT render the downgrade banner when scheduledPlan is null", async () => {
      await renderCard({
        subscription: makeSub({ scheduledPlan: null, scheduledChangeAt: null }),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      // The active-renewal banner (variant=neutral) is allowed in this
      // state — what matters is that the downgrade-specific banner and
      // its release control are absent.
      const banner = screen.queryByTestId("alert-banner");
      if (banner) {
        expect(banner.getAttribute("data-variant")).not.toBe("info");
        expect(banner.textContent).not.toContain("scheduledDowngradeHeadline");
      }
      expect(
        screen.queryByTestId("release-scheduled-change"),
      ).not.toBeInTheDocument();
    });

    it("does NOT render the downgrade banner when canManage=false", async () => {
      await renderCard({
        subscription: makeSub({
          scheduledPlan,
          scheduledChangeAt: "2026-03-01T00:00:00Z",
        }),
        locale: "en",
        planName: "Pro",
        canManage: false,
        teamOwnerName: null,
      });

      expect(screen.queryByTestId("alert-banner")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("release-scheduled-change"),
      ).not.toBeInTheDocument();
    });

    it("pins context on ReleaseScheduledChangeButton when concurrent", async () => {
      await renderCard({
        subscription: makeSub({
          scheduledPlan,
          scheduledChangeAt: "2026-03-01T00:00:00Z",
        }),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
        isConcurrent: true,
      });

      expect(screen.getByTestId("release-scheduled-change")).toHaveAttribute(
        "data-context",
        "personal",
      );
    });

    it("renders the card without a wrapper div when there is no downgrade banner", async () => {
      const { container } = await renderCard({
        subscription: makeSub(),
        locale: "en",
        planName: "Pro",
        canManage: true,
        teamOwnerName: null,
      });

      // Without a banner, the component returns the card directly (no wrapper).
      expect(
        container.querySelector('[data-testid="subscription-card"]'),
      ).toBeInTheDocument();
      expect(container.querySelector(".space-y-3")).not.toBeInTheDocument();
    });
  });
});
