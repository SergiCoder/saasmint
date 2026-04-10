import { describe, it, expect, vi } from "vitest";

vi.mock("@/infrastructure/auth/cookies", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  clearAuthCookies: vi.fn(),
}));

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: vi.fn(),
  apiFetch: vi.fn(),
}));

const {
  authGateway,
  userGateway,
  planGateway,
  productGateway,
  subscriptionGateway,
  orgGateway,
  orgMemberGateway,
} = await import("@/infrastructure/registry");

const { DjangoApiAuthGateway } =
  await import("@/infrastructure/api/DjangoApiAuthGateway");
const { DjangoApiUserGateway } =
  await import("@/infrastructure/api/DjangoApiUserGateway");
const { DjangoApiPlanGateway } =
  await import("@/infrastructure/api/DjangoApiPlanGateway");
const { DjangoApiProductGateway } =
  await import("@/infrastructure/api/DjangoApiProductGateway");
const { DjangoApiSubscriptionGateway } =
  await import("@/infrastructure/api/DjangoApiSubscriptionGateway");
const { DjangoApiOrgGateway } =
  await import("@/infrastructure/api/DjangoApiOrgGateway");
const { DjangoApiOrgMemberGateway } =
  await import("@/infrastructure/api/DjangoApiOrgMemberGateway");

describe("registry", () => {
  it("exports authGateway as DjangoApiAuthGateway", () => {
    expect(authGateway).toBeInstanceOf(DjangoApiAuthGateway);
  });

  it("exports userGateway as DjangoApiUserGateway", () => {
    expect(userGateway).toBeInstanceOf(DjangoApiUserGateway);
  });

  it("exports planGateway as DjangoApiPlanGateway", () => {
    expect(planGateway).toBeInstanceOf(DjangoApiPlanGateway);
  });

  it("exports productGateway as DjangoApiProductGateway", () => {
    expect(productGateway).toBeInstanceOf(DjangoApiProductGateway);
  });

  it("exports subscriptionGateway as DjangoApiSubscriptionGateway", () => {
    expect(subscriptionGateway).toBeInstanceOf(DjangoApiSubscriptionGateway);
  });

  it("exports orgGateway as DjangoApiOrgGateway", () => {
    expect(orgGateway).toBeInstanceOf(DjangoApiOrgGateway);
  });

  it("exports orgMemberGateway as DjangoApiOrgMemberGateway", () => {
    expect(orgMemberGateway).toBeInstanceOf(DjangoApiOrgMemberGateway);
  });
});
