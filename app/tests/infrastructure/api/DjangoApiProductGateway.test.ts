import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Product } from "@/domain/models/Product";

const mockApiFetch = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

const { DjangoApiProductGateway } =
  await import("@/infrastructure/api/DjangoApiProductGateway");

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DjangoApiProductGateway", () => {
  const gateway = new DjangoApiProductGateway();

  describe("listProducts", () => {
    it("fetches products with GET /billing/products/", async () => {
      mockApiFetch.mockResolvedValue(products);

      const result = await gateway.listProducts();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/products/");
      expect(result).toEqual(products);
    });

    it("returns an empty array when no products exist", async () => {
      mockApiFetch.mockResolvedValue([]);

      const result = await gateway.listProducts();
      expect(result).toEqual([]);
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetch.mockResolvedValue(products);

      await gateway.listProducts("eur");

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/products/?currency=eur",
      );
    });

    it("propagates errors from apiFetch", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 500: Server Error"));

      await expect(gateway.listProducts()).rejects.toThrow(
        "API 500: Server Error",
      );
    });
  });
});
