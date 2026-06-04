import { cache } from "react";
import { productGateway } from "@/infrastructure/registry";
import type { Product } from "@/domain/models/Product";

/**
 * Fetches the one-time product catalog for the given currency. Same caching
 * rationale as `getPlans`: rarely changes, deduplicates across layout + page.
 */
export const getProducts = cache(async function getProducts(
  currency?: string,
): Promise<Product[]> {
  return productGateway
    .listProducts(currency)
    .catch((err: unknown): Product[] => {
      console.error("Failed to fetch products", err);
      return [];
    });
});
