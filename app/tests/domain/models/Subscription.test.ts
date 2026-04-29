import { describe, it, expect } from "vitest";
import {
  findPersonalSubscription,
  findTeamSubscription,
  type Subscription,
} from "@/domain/models/Subscription";

function makeSub(overrides: Partial<Subscription> & { id: string }): Subscription {
  return {
    id: overrides.id,
    status: overrides.status ?? "active",
    plan: overrides.plan ?? {
      id: `${overrides.id}-plan`,
      name: "Pro",
      description: "",
      context: "personal",
      tier: 3,
      interval: "month",
      price: null,
    },
    quantity: overrides.quantity ?? 1,
    trialEndsAt: overrides.trialEndsAt ?? null,
    currentPeriodStart:
      overrides.currentPeriodStart ?? "2026-01-01T00:00:00Z",
    currentPeriodEnd: overrides.currentPeriodEnd ?? "2026-02-01T00:00:00Z",
    canceledAt: overrides.canceledAt ?? null,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00Z",
  };
}

const personalSub = makeSub({
  id: "sub_personal",
  plan: {
    id: "p1",
    name: "Personal Pro",
    description: "",
    context: "personal",
    tier: 3,
    interval: "month",
    price: null,
  },
});

const teamSub = makeSub({
  id: "sub_team",
  plan: {
    id: "p2",
    name: "Team Pro",
    description: "",
    context: "team",
    tier: 3,
    interval: "month",
    price: null,
  },
});

describe("findPersonalSubscription", () => {
  it("returns null on an empty list (free tier)", () => {
    expect(findPersonalSubscription([])).toBeNull();
  });

  it("returns the personal row when present alongside a team row (concurrent billing)", () => {
    expect(findPersonalSubscription([teamSub, personalSub])).toBe(personalSub);
  });

  it("returns null when only a team row exists", () => {
    expect(findPersonalSubscription([teamSub])).toBeNull();
  });

  it("returns the personal row when it is the only row", () => {
    expect(findPersonalSubscription([personalSub])).toBe(personalSub);
  });
});

describe("findTeamSubscription", () => {
  it("returns null on an empty list (free tier)", () => {
    expect(findTeamSubscription([])).toBeNull();
  });

  it("returns the team row when present alongside a personal row (concurrent billing)", () => {
    expect(findTeamSubscription([personalSub, teamSub])).toBe(teamSub);
  });

  it("returns null when only a personal row exists", () => {
    expect(findTeamSubscription([personalSub])).toBeNull();
  });

  it("returns the team row when it is the only row", () => {
    expect(findTeamSubscription([teamSub])).toBe(teamSub);
  });
});
