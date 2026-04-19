import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { Org } from "@/domain/models/Org";

// --- Mocks ---------------------------------------------------------------

const mockTranslate = vi.fn((key: string) => key);
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(mockTranslate)),
  setRequestLocale: vi.fn(),
}));

const mockRedirect = vi.fn((path: string) => {
  const err = new Error("NEXT_REDIRECT");
  (err as Error & { path: string }).path = path;
  throw err;
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => mockRedirect(path),
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetUserOrgs = vi.fn<(userId: string) => Promise<Org[]>>();
vi.mock("@/app/[locale]/(app)/_data/getUserOrgs", () => ({
  getUserOrgs: (userId: string) => mockGetUserOrgs(userId),
}));

vi.mock("@/presentation/components/molecules/OrgCard", async () => {
  const React = await import("react");
  return {
    OrgCard: ({ slug, name }: { slug: string; name: string }) =>
      React.createElement("div", { "data-testid": `org-card-${slug}` }, name),
  };
});

// --- Import under test (after mocks) -------------------------------------

const { default: OrgListPage } = await import("@/app/[locale]/(app)/org/page");

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

// --- Tests ----------------------------------------------------------------

describe("OrgListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
  });

  it("redirects to /subscription when the user has no orgs", async () => {
    mockGetUserOrgs.mockResolvedValue([]);

    await expect(
      OrgListPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/subscription");
  });

  it("redirects to /org/{slug} when the user has exactly one org", async () => {
    mockGetUserOrgs.mockResolvedValue([
      makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
    ]);

    await expect(
      OrgListPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/org/acme");
  });

  it("renders the org list when the user belongs to multiple orgs", async () => {
    mockGetUserOrgs.mockResolvedValue([
      makeOrg({ id: "o1", slug: "acme", name: "Acme Corp" }),
      makeOrg({ id: "o2", slug: "globex", name: "Globex Inc" }),
      makeOrg({ id: "o3", slug: "initech", name: "Initech" }),
    ]);

    const jsx = await OrgListPage({
      params: Promise.resolve({ locale: "en" }),
    });
    render(jsx);

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "title" })).toBeInTheDocument();
    expect(screen.getByTestId("org-card-acme")).toHaveTextContent("Acme Corp");
    expect(screen.getByTestId("org-card-globex")).toHaveTextContent(
      "Globex Inc",
    );
    expect(screen.getByTestId("org-card-initech")).toHaveTextContent("Initech");
  });

  it("passes the authenticated user id to getUserOrgs", async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser({ id: "user-42" }));
    mockGetUserOrgs.mockResolvedValue([
      makeOrg({ id: "o1", slug: "acme" }),
      makeOrg({ id: "o2", slug: "globex" }),
    ]);

    await OrgListPage({ params: Promise.resolve({ locale: "en" }) });

    expect(mockGetUserOrgs).toHaveBeenCalledWith("user-42");
  });
});
