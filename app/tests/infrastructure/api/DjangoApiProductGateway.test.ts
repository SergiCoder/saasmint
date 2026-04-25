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
      mockApiFetch.mockResolvedValue({ results: products });

      const result = await gateway.listProducts();

      expect(mockApiFetch).toHaveBeenCalledWith("/billing/products/");
      expect(result).toEqual(products);
    });

    it("returns an empty array when no products exist", async () => {
      mockApiFetch.mockResolvedValue({ results: [] });

      const result = await gateway.listProducts();
      expect(result).toEqual([]);
    });

    it("appends ?currency= query string when currency is provided", async () => {
      mockApiFetch.mockResolvedValue({ results: products });

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

  describe("createCheckoutSession", () => {
    it("posts snake_case body to /billing/product-checkout-sessions/ and returns the url", async () => {
      mockApiFetch.mockResolvedValue({ url: "https://checkout.stripe.com/x" });

      const result = await gateway.createCheckoutSession({
        productPriceId: "pp1",
        successUrl: "https://app.example.com/subscription?status=success",
        cancelUrl: "https://app.example.com/subscription",
      });

      expect(mockApiFetch).toHaveBeenCalledWith(
        "/billing/product-checkout-sessions/",
        {
          method: "POST",
          body: JSON.stringify({
            product_price_id: "pp1",
            success_url: "https://app.example.com/subscription?status=success",
            cancel_url: "https://app.example.com/subscription",
          }),
        },
      );
      expect(result).toEqual({ url: "https://checkout.stripe.com/x" });
    });

    it("propagates errors from apiFetch (e.g. 403 for non-owner team members)", async () => {
      mockApiFetch.mockRejectedValue(new Error("API 403: Forbidden"));

      await expect(
        gateway.createCheckoutSession({
          productPriceId: "pp1",
          successUrl: "https://app.example.com/subscription?status=success",
          cancelUrl: "https://app.example.com/subscription",
        }),
      ).rejects.toThrow("API 403: Forbidden");
    });
  });
});
