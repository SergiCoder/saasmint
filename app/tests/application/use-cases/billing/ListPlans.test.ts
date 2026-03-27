import { describe, it, expect, vi } from "vitest";
import { ListPlans } from "@/application/use-cases/billing/ListPlans";
import type { IPlanGateway } from "@/application/ports/IPlanGateway";
import type { Plan } from "@/domain/models/Plan";

const plans: Plan[] = [
  {
    id: "p1",
    name: "Starter",
    context: "personal",
    interval: "month",
    isActive: true,
    prices: [],
  },
  {
    id: "p2",
    name: "Team",
    context: "team",
    interval: "year",
    isActive: true,
    prices: [],
  },
];

function makeGateway(overrides?: Partial<IPlanGateway>): IPlanGateway {
  return {
    listPlans: vi.fn().mockResolvedValue(plans),
    ...overrides,
  };
}

describe("ListPlans", () => {
  it("returns all active plans", async () => {
    const gateway = makeGateway();
    const result = await new ListPlans(gateway).execute();
    expect(result).toEqual(plans);
    expect(gateway.listPlans).toHaveBeenCalledOnce();
  });
});
