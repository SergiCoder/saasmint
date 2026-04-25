import type {
  IProductGateway,
  ProductCheckoutInput,
} from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";
import { apiFetch } from "./apiClient";
import { keysToCamelWithPrice, keysToSnake } from "./caseTransform";
import { CheckoutSessionResponseSchema, ProductSchema } from "./schemas";

export class DjangoApiProductGateway implements IProductGateway {
  async listProducts(currency?: string): Promise<Product[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const data = await apiFetch<{ results: Record<string, unknown>[] }>(
      `/billing/products/${query}`,
    );
    return data.results.map((r) =>
      ProductSchema.parse(keysToCamelWithPrice(r, currency)),
    );
  }

  async createCheckoutSession(
    input: ProductCheckoutInput,
  ): Promise<{ url: string }> {
    const raw = await apiFetch<unknown>("/billing/product-checkout-sessions/", {
      method: "POST",
      body: JSON.stringify(keysToSnake(input)),
    });
    return CheckoutSessionResponseSchema.parse(raw);
  }
}
