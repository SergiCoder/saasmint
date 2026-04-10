import { describe, it, expect, vi } from "vitest";
import { ListProducts } from "@/application/use-cases/billing/ListProducts";
import type { IProductGateway } from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";

const products: Product[] = [
  {
    id: "prod1",
    name: "Boost 1",
    type: "one_time",
    credits: 100,
    price: {
      id: "pp1",
      amount: 999,
      displayAmount: 9.99,
      currency: "usd",
    },
  },
];

function makeGateway(overrides?: Partial<IProductGateway>): IProductGateway {
  return {
    listProducts: vi.fn().mockResolvedValue(products),
    ...overrides,
  };
}

describe("ListProducts", () => {
  it("returns all active products", async () => {
    const gateway = makeGateway();
    const result = await new ListProducts(gateway).execute();
    expect(result).toEqual(products);
    expect(gateway.listProducts).toHaveBeenCalledOnce();
  });
});
