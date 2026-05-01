import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { User } from "@/domain/models/User";
import type { PhonePrefix } from "@/domain/models/PhonePrefix";
import type { Subscription } from "@/domain/models/Subscription";
import type { OrgMember } from "@/domain/models/OrgMember";
import { translate } from "../../_helpers/translate";

// --- Mocks ---------------------------------------------------------------

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(() => Promise.resolve(translate)),
  setRequestLocale: vi.fn(),
}));

const mockGetProfile = vi.fn<() => Promise<User>>();
const mockGetPhonePrefixes = vi.fn<() => Promise<PhonePrefix[]>>();
vi.mock("@/infrastructure/registry", () => ({
  userGateway: { getProfile: () => mockGetProfile() },
  referenceGateway: { getPhonePrefixes: () => mockGetPhonePrefixes() },
}));

const mockGetMyOrgRole = vi.fn<() => Promise<OrgMember["role"] | null>>();
vi.mock("@/app/[locale]/(app)/_data/getMyOrgRole", () => ({
  getMyOrgRole: () => mockGetMyOrgRole(),
}));

const mockGetCurrentUser = vi.fn<() => Promise<User>>();
vi.mock("@/app/[locale]/(app)/_data/getCurrentUser", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

const mockGetSubscriptions =
  vi.fn<(currency?: string) => Promise<Subscription[]>>();
vi.mock("@/app/[locale]/(app)/_data/getSubscriptions", () => ({
  getSubscriptions: (currency?: string) => mockGetSubscriptions(currency),
}));

// Stub the client child components so we can capture the props the page
// passes them without rendering their full trees.
const profileFormPropsCapture = vi.fn<(props: unknown) => void>();
vi.mock("@/app/[locale]/(app)/profile/_components/ProfileForm", async () => {
  const React = await import("react");
  return {
    ProfileForm: (props: { currencyLocked?: boolean }) => {
      profileFormPropsCapture(props);
      return React.createElement("div", {
        "data-testid": "profile-form",
        "data-currency-locked": String(props.currencyLocked ?? false),
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
    DangerZone: (props: { deleteRestriction?: "owner" }) => {
      dangerZonePropsCapture(props);
      return React.createElement("div", {
        "data-testid": "danger-zone",
        "data-restriction": props.deleteRestriction ?? "",
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
    cancelAt: null,
    canceledAt: null,
    scheduledPlan: null,
    scheduledChangeAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

async function renderPage() {
  const jsx = await ProfilePage({
    params: Promise.resolve({ locale: "en" }),
  });
  return render(jsx as React.ReactElement);
}

// --- Tests ----------------------------------------------------------------

describe("ProfilePage (currency-locked wiring)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(makeUser());
    mockGetProfile.mockResolvedValue(makeUser());
    mockGetPhonePrefixes.mockResolvedValue([]);
    mockGetMyOrgRole.mockResolvedValue(null);
    mockGetSubscriptions.mockResolvedValue([]);
  });

  it("calls getSubscriptions once per render to compute the lock flag", async () => {
    await renderPage();

    expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
  });

  it("passes currencyLocked=false to ProfileForm when there are no subscriptions", async () => {
    mockGetSubscriptions.mockResolvedValue([]);

    const { getByTestId } = await renderPage();

    expect(getByTestId("profile-form")).toHaveAttribute(
      "data-currency-locked",
      "false",
    );
    expect(profileFormPropsCapture).toHaveBeenCalledWith(
      expect.objectContaining({ currencyLocked: false }),
    );
  });

  it("passes currencyLocked=true to ProfileForm when the user has any active subscription", async () => {
    mockGetSubscriptions.mockResolvedValue([makeSub()]);

    const { getByTestId } = await renderPage();

    expect(getByTestId("profile-form")).toHaveAttribute(
      "data-currency-locked",
      "true",
    );
    expect(profileFormPropsCapture).toHaveBeenCalledWith(
      expect.objectContaining({ currencyLocked: true }),
    );
  });

  it("treats a canceled-but-still-present subscription row as currencyLocked=true", async () => {
    // Even cancelled subs imply a Stripe customer exists, which is what
    // really locks the billing currency. The page comment makes this
    // explicit — don't regress to a status-based check.
    mockGetSubscriptions.mockResolvedValue([
      makeSub({ status: "canceled", canceledAt: "2026-04-01T00:00:00Z" }),
    ]);

    const { getByTestId } = await renderPage();

    expect(getByTestId("profile-form")).toHaveAttribute(
      "data-currency-locked",
      "true",
    );
  });
});
