import type {
  IProductGateway,
  ProductCheckoutInput,
} from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";
import { apiFetch } from "./apiClient";
import { keysToCamelWithPrice, keysToSnake } from "./caseTransform";
import { contextQuery } from "./contextQuery";
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
    const { context, ...body } = input;
    const raw = await apiFetch<Record<string, unknown>>(
      `/billing/product-checkout-sessions/${contextQuery(context)}`,
      {
        method: "POST",
        body: JSON.stringify(keysToSnake(body)),
      },
    );
    return CheckoutSessionResponseSchema.parse(raw);
  }
}
