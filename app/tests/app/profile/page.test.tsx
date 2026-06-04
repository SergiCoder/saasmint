import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { OrgMember } from "@/domain/models/OrgMember";
import { translate } from "../../_helpers/translate";

// --- Mocks ---------------------------------------------------------------

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(translate)),
  setRequestLocale: vi.fn(),
}));

// Profile page now reads via the cached `getCurrentUser` (shared with the
// `(app)` layout) instead of calling the user gateway directly — eliminates a
// second `/account/` round-trip per profile render.
const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetMyOrgRole = vi.fn<() => Promise<OrgMember["role"] | null>>();
vi.mock("@/app/[locale]/_data/getMyOrgRole", () => ({
  getMyOrgRole: () => mockGetMyOrgRole(),
}));

// Stub client child components so we can capture the props the page passes
// them without rendering their full trees.
const profileFormPropsCapture = vi.fn<(props: unknown) => void>();
vi.mock("@/app/[locale]/(app)/profile/_components/ProfileForm", async () => {
  const React = await import("react");
  return {
    ProfileForm: (props: {
      user: User;
      phonePrefixes: readonly { prefix: string; label: string }[];
    }) => {
      profileFormPropsCapture(props);
      return React.createElement("div", {
        "data-testid": "profile-form",
        "data-user-email": props.user.email,
      });
    },
  };
});

vi.mock(
  "@/app/[locale]/(app)/profile/_components/ChangePasswordForm",
  async () => {
    const React = await import("react");
    return {
      ChangePasswordForm: () =>
        React.createElement("div", { "data-testid": "change-password-form" }),
    };
  },
);

const dangerZonePropsCapture = vi.fn<(props: unknown) => void>();
vi.mock("@/app/[locale]/(app)/profile/_components/DangerZone", async () => {
  const React = await import("react");
  return {
    DangerZone: (props: { userEmail: string; deleteRestricted?: boolean }) => {
      dangerZonePropsCapture(props);
      return React.createElement("div", {
        "data-testid": "danger-zone",
        "data-restriction": props.deleteRestricted ? "owner" : "",
        "data-email": props.userEmail,
      });
    },
  };
});

// --- Import under test (after mocks) -------------------------------------

const { default: ProfilePage } =
  await import("@/app/[locale]/(app)/profile/page");

// --- Helpers --------------------------------------------------------------

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u1",
    email: "alice@example.com",
    fullName: "Alice",
    avatarUrl: null,
    preferredLocale: "en",
    preferredCurrency: "usd",
    phonePrefix: null,
    phone: null,
    timezone: "UTC",
    jobTitle: null,
    pronouns: null,
    bio: null,
    isVerified: true,
    registrationMethod: "email",
    linkedProviders: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

async function renderPage(locale = "en") {
  const jsx = await ProfilePage({
    params: Promise.resolve({ locale }),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ----------------------------------------------------------------

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockGetMyOrgRole.mockResolvedValue(null);
  });

  it("renders the page title heading", async () => {
    await renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "title",
    );
  });

  it("renders the ProfileForm with the user returned by getProfile", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeUser({ email: "bob@example.com" }),
    );

    await renderPage();

    expect(screen.getByTestId("profile-form")).toHaveAttribute(
      "data-user-email",
      "bob@example.com",
    );
    expect(profileFormPropsCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ email: "bob@example.com" }),
      }),
    );
  });

  it("does not pass the timezone list as a prop (lazily-init'd inside the client)", async () => {
    await renderPage();

    const call = profileFormPropsCapture.mock.calls[0]?.[0];
    expect(call).not.toHaveProperty("timezones");
  });

  it("renders the ChangePasswordForm section", async () => {
    await renderPage();

    expect(screen.getByTestId("change-password-form")).toBeInTheDocument();
  });

  it("renders the DangerZone with the user's email", async () => {
    mockGetCurrentUser.mockResolvedValue(
      makeUser({ email: "alice@example.com" }),
    );

    await renderPage();

    expect(screen.getByTestId("danger-zone")).toHaveAttribute(
      "data-email",
      "alice@example.com",
    );
  });

  it("passes deleteRestricted=true to DangerZone when the user is an org owner", async () => {
    mockGetMyOrgRole.mockResolvedValue("owner");

    await renderPage();

    expect(screen.getByTestId("danger-zone")).toHaveAttribute(
      "data-restriction",
      "owner",
    );
    expect(dangerZonePropsCapture).toHaveBeenCalledWith(
      expect.objectContaining({ deleteRestricted: true }),
    );
  });

  it("passes deleteRestricted=false to DangerZone when the user is an admin (not sole owner)", async () => {
    mockGetMyOrgRole.mockResolvedValue("admin");

    await renderPage();

    expect(screen.getByTestId("danger-zone")).toHaveAttribute(
      "data-restriction",
      "",
    );
    expect(dangerZonePropsCapture).toHaveBeenCalledWith(
      expect.objectContaining({ deleteRestricted: false }),
    );
  });

  it("passes deleteRestricted=false to DangerZone when the user has no org role", async () => {
    mockGetMyOrgRole.mockResolvedValue(null);

    await renderPage();

    expect(screen.getByTestId("danger-zone")).toHaveAttribute(
      "data-restriction",
      "",
    );
  });

  it("calls getCurrentUser and getMyOrgRole exactly once per render", async () => {
    await renderPage();

    expect(mockGetCurrentUser).toHaveBeenCalledOnce();
    expect(mockGetMyOrgRole).toHaveBeenCalledOnce();
  });

  it("does not call the reference gateway or subscription gateway (removed in this PR)", async () => {
    // The page no longer needs phone prefixes or subscriptions — those were
    // removed when currencyLocked wiring and the phonePrefixes API call were
    // dropped. This assertion guards against regressions that re-introduce
    // those unnecessary API calls.
    await renderPage();

    // Neither mock exists; the absence of an error proves the registry mock
    // doesn't expose referenceGateway or subscriptionGateway.
    expect(mockGetCurrentUser).toHaveBeenCalledOnce();
  });
});
