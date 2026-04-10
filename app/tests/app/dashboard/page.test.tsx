import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Org } from "@/domain/models/Org";

// --- Mocks ---------------------------------------------------------------

const mockTranslate = vi.fn((key: string, params?: Record<string, unknown>) => {
  if (params && "name" in params) return `${key}::${params.name}`;
  return key;
});

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
}));

vi.mock("next", () => ({
  default: {},
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockListUserOrgsExecute = vi.fn<() => Promise<Org[]>>();
vi.mock("@/application/use-cases/org/ListUserOrgs", () => ({
  ListUserOrgs: function ListUserOrgs() {
    return { execute: mockListUserOrgsExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  orgGateway: {},
}));

vi.mock("@/presentation/components/molecules/OrgCard", async () => {
  const React = await import("react");
  return {
    OrgCard: ({ slug, name }: { slug: string; name: string }) =>
      React.createElement("div", { "data-testid": `org-card-${slug}` }, name),
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
    scheduledDeletionAt: null,
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
  const jsx = await DashboardPage();
  return render(jsx);
}

// --- Tests ----------------------------------------------------------------

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockListUserOrgsExecute.mockResolvedValue([]);
  });

  it("renders welcome message with user full name", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ fullName: "Jane Doe" }));

    await renderPage();

    expect(screen.getByText("welcome::Jane Doe")).toBeInTheDocument();
  });

  it("falls back to email when fullName is empty", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeUser({ fullName: "", email: "jane@example.com" }),
    );

    await renderPage();

    expect(screen.getByText("welcome::jane@example.com")).toBeInTheDocument();
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

  it("passes user.id to ListUserOrgs", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-42" }));

    await renderPage();

    expect(mockListUserOrgsExecute).toHaveBeenCalledWith("user-42");
  });
});
