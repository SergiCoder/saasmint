import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Org } from "@/domain/models/Org";
import type { Subscription } from "@/domain/models/Subscription";
import { translate } from "../../_helpers/translate";

// --- Mocks ---------------------------------------------------------------

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(translate)),
  setRequestLocale: vi.fn(),
}));

vi.mock("next", () => ({
  default: {},
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockListUserOrgsExecute = vi.fn<() => Promise<Org[]>>();
const mockListOrgMembersExecute =
  vi.fn<() => Promise<{ user: { id: string } }[]>>();
const mockListSubscriptionsExecute = vi.fn<() => Promise<Subscription[]>>();

vi.mock("@/infrastructure/registry", () => ({
  orgGateway: { listUserOrgs: () => mockListUserOrgsExecute() },
  orgMemberGateway: { listMembers: () => mockListOrgMembersExecute() },
  subscriptionGateway: {
    listSubscriptions: () => mockListSubscriptionsExecute(),
  },
}));

vi.mock("@/presentation/components/molecules/OrgCard", async () => {
  const React = await import("react");
  return {
    OrgCard: ({
      slug,
      name,
      spotsLabel,
    }: {
      slug: string;
      name: string;
      spotsLabel?: string;
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": `org-card-${slug}`,
          "data-spots-label": spotsLabel ?? "",
        },
        name,
      ),
  };
});

// --- Import under test (after mocks) -------------------------------------

const { default: DashboardPage } =
  await import("@/app/[locale]/(app)/dashboard/page");

// --- Helpers --------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",

    email: "test@example.com",
    fullName: "Test User",
    avatarUrl: null,
    accountType: "personal",
    preferredLocale: "en",
    preferredCurrency: "usd",
    phonePrefix: null,
    phone: null,
    timezone: null,
    jobTitle: null,
    pronouns: null,
    bio: null,
    isVerified: true,
    createdAt: "2025-01-01T00:00:00Z",
    registrationMethod: "email",
    linkedProviders: [],
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeOrg(overrides: Partial<Org> = {}): Org {
  return {
    id: "org-1",
    name: "Acme Corp",
    slug: "acme",
    logoUrl: null,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

async function renderPage() {
  const jsx = await DashboardPage({
    params: Promise.resolve({ locale: "en" }),
  });
  return render(jsx);
}

// --- Tests ----------------------------------------------------------------

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockListUserOrgsExecute.mockResolvedValue([]);
    mockListOrgMembersExecute.mockResolvedValue([]);
    mockListSubscriptionsExecute.mockResolvedValue([]);
  });

  it("renders welcome heading with user full name", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ fullName: "Jane Doe" }));

    await renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Jane Doe",
    );
  });

  it("falls back to email when fullName is empty", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeUser({ fullName: "", email: "jane@example.com" }),
    );

    await renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "jane@example.com",
    );
  });

  it("renders subtitle", async () => {
    await renderPage();

    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("renders quick-start section heading", async () => {
    await renderPage();

    expect(screen.getByText("quickStart")).toBeInTheDocument();
  });

  it("renders all four quick-start action cards", async () => {
    await renderPage();

    const links = screen
      .getAllByRole("link")
      .filter((a) =>
        ["/subscription", "/profile", "/org", "#"].includes(
          a.getAttribute("href") ?? "",
        ),
      );
    expect(links).toHaveLength(4);
  });

  it("renders correct hrefs for action cards", async () => {
    await renderPage();

    expect(screen.getByText("actionBillingTitle").closest("a")).toHaveAttribute(
      "href",
      "/subscription",
    );
    expect(screen.getByText("actionProfileTitle").closest("a")).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(screen.getByText("actionOrgTitle").closest("a")).toHaveAttribute(
      "href",
      "/org",
    );
    expect(
      screen.getByText("actionCustomizeTitle").closest("a"),
    ).toHaveAttribute("href", "#");
  });

  it("renders title and description for each action card", async () => {
    await renderPage();

    for (const key of [
      "actionBilling",
      "actionProfile",
      "actionOrg",
      "actionCustomize",
    ]) {
      expect(screen.getByText(`${key}Title`)).toBeInTheDocument();
      expect(screen.getByText(`${key}Desc`)).toBeInTheDocument();
    }
  });

  it("does not render org section when user has no orgs", async () => {
    mockListUserOrgsExecute.mockResolvedValue([]);

    await renderPage();

    expect(screen.queryByTestId("org-card-acme")).not.toBeInTheDocument();
  });

  it("renders org cards when user has orgs", async () => {
    mockListUserOrgsExecute.mockResolvedValue([
      makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
      makeOrg({ id: "o2", slug: "globex", name: "Globex Inc" }),
    ]);

    await renderPage();

    expect(screen.getByTestId("org-card-acme")).toHaveTextContent("Acme Corp");
    expect(screen.getByTestId("org-card-globex")).toHaveTextContent(
      "Globex Inc",
    );
  });

  it("calls ListUserOrgs without arguments (current user resolved from auth)", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-42" }));

    await renderPage();

    expect(mockListUserOrgsExecute).toHaveBeenCalledWith();
  });

  describe("team-subscription spots label", () => {
    function makeSub(
      context: "personal" | "team",
      quantity: number,
    ): Subscription {
      return {
        id: `sub_${context}`,
        status: "active",
        plan: {
          id: `plan_${context}`,
          name: "Pro",
          description: "",
          context,
          tier: 3,
          interval: "month",
          price: null,
        },
        quantity,
        trialEndsAt: null,
        currentPeriodStart: "2026-01-01T00:00:00Z",
        currentPeriodEnd: "2026-02-01T00:00:00Z",
        canceledAt: null,
        createdAt: "2026-01-01T00:00:00Z",
      };
    }

    it("does not render a spotsLabel when the user has no subscription", async () => {
      mockListUserOrgsExecute.mockResolvedValue([
        makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
      ]);
      mockListSubscriptionsExecute.mockResolvedValue([]);

      await renderPage();

      expect(screen.getByTestId("org-card-acme")).toHaveAttribute(
        "data-spots-label",
        "",
      );
      // Member-count fan-out skipped when there are no team seats to show.
      expect(mockListOrgMembersExecute).not.toHaveBeenCalled();
    });

    it("does not render a spotsLabel when the only sub is personal", async () => {
      mockListUserOrgsExecute.mockResolvedValue([
        makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
      ]);
      mockListSubscriptionsExecute.mockResolvedValue([makeSub("personal", 1)]);

      await renderPage();

      expect(screen.getByTestId("org-card-acme")).toHaveAttribute(
        "data-spots-label",
        "",
      );
      expect(mockListOrgMembersExecute).not.toHaveBeenCalled();
    });

    it("renders the spotsLabel using the team sub's quantity (single-sub team case)", async () => {
      mockListUserOrgsExecute.mockResolvedValue([
        makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
      ]);
      mockListSubscriptionsExecute.mockResolvedValue([makeSub("team", 5)]);
      // OrgCard renders spotsUsed when totalSpots is provided. The translation
      // stub echoes the key with interpolated params (used/total).
      mockListOrgMembersExecute.mockResolvedValue([
        { user: { id: "u1" } },
        { user: { id: "u2" } },
        { user: { id: "u3" } },
      ]);

      await renderPage();

      const label = screen
        .getByTestId("org-card-acme")
        .getAttribute("data-spots-label");
      expect(label).toContain("3");
      expect(label).toContain("5");
      expect(mockListOrgMembersExecute).toHaveBeenCalledTimes(1);
    });

    it("picks the team sub for spotsLabel when the user has both personal and team subs (rule 5)", async () => {
      // Concurrent personal+team — totalSpots must come from the team row,
      // not the personal one (which has quantity=1 by default).
      mockListUserOrgsExecute.mockResolvedValue([
        makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
      ]);
      mockListSubscriptionsExecute.mockResolvedValue([
        makeSub("personal", 1),
        makeSub("team", 8),
      ]);
      mockListOrgMembersExecute.mockResolvedValue([
        { user: { id: "u1" } },
        { user: { id: "u2" } },
      ]);

      await renderPage();

      const label = screen
        .getByTestId("org-card-acme")
        .getAttribute("data-spots-label");
      // total comes from the team sub (quantity=8), not the personal one (1).
      expect(label).toContain("8");
      expect(label).toContain("2");
    });
  });
});
