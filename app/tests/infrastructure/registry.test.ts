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

const registry = await import("@/infrastructure/registry");

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
const { DjangoApiInvitationGateway } =
  await import("@/infrastructure/api/DjangoApiInvitationGateway");
const { DjangoApiReferenceGateway } =
  await import("@/infrastructure/api/DjangoApiReferenceGateway");

// Each row proves both "correct class instance" and "singleton identity"
// (second import returns the same object reference) — if the registry ever
// lazily constructs or mis-types a gateway, one of these blows up.
const GATEWAYS = [
  ["authGateway", registry.authGateway, DjangoApiAuthGateway],
  ["userGateway", registry.userGateway, DjangoApiUserGateway],
  ["planGateway", registry.planGateway, DjangoApiPlanGateway],
  ["productGateway", registry.productGateway, DjangoApiProductGateway],
  [
    "subscriptionGateway",
    registry.subscriptionGateway,
    DjangoApiSubscriptionGateway,
  ],
  ["orgGateway", registry.orgGateway, DjangoApiOrgGateway],
  ["orgMemberGateway", registry.orgMemberGateway, DjangoApiOrgMemberGateway],
  ["invitationGateway", registry.invitationGateway, DjangoApiInvitationGateway],
  ["referenceGateway", registry.referenceGateway, DjangoApiReferenceGateway],
] as const;

describe("registry", () => {
  it.each(GATEWAYS)(
    "exports %s as an instance of its concrete gateway class",
    (_name, instance, Ctor) => {
      expect(instance).toBeInstanceOf(Ctor);
    },
  );

  it("returns the same singleton instance on repeat import", async () => {
    const again = await import("@/infrastructure/registry");
    for (const [name, instance] of GATEWAYS) {
      expect(again[name as keyof typeof again]).toBe(instance);
    }
  });
});
