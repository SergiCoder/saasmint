import { describe, it, expect, vi, beforeEach } from "vitest";

const mockListProducts = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  productGateway: {
    listProducts: (...args: unknown[]) => mockListProducts(...args),
  },
}));

let getProducts: typeof import("@/app/[locale]/(app)/_data/getProducts").getProducts;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  const mod = await import("@/app/[locale]/(app)/_data/getProducts");
  getProducts = mod.getProducts;
});

describe("getProducts", () => {
  it("returns the products resolved by the gateway", async () => {
    const products = [
      { id: "prod_1", name: "Credits Pack", type: "one_time", credits: 100 },
      { id: "prod_2", name: "Mega Pack", type: "one_time", credits: 500 },
    ];
    mockListProducts.mockResolvedValue(products);

    const result = await getProducts("usd");

    expect(mockListProducts).toHaveBeenCalledWith("usd");
    expect(result).toBe(products);
  });

  it("passes undefined when no currency is provided", async () => {
    mockListProducts.mockResolvedValue([]);

    await getProducts();

    expect(mockListProducts).toHaveBeenCalledWith(undefined);
  });

  it("returns an empty array and logs the error when the gateway throws", async () => {
    const error = new Error("API 503 Service Unavailable");
    mockListProducts.mockRejectedValue(error);

    const result = await getProducts("usd");

    expect(result).toEqual([]);
    expect(vi.mocked(console.error)).toHaveBeenCalledWith(
      "Failed to fetch products",
      error,
    );
  });

  it("returns an empty array when the gateway resolves with no rows", async () => {
    mockListProducts.mockResolvedValue([]);

    const result = await getProducts("eur");

    expect(result).toEqual([]);
  });
});
