import type {
  IProductGateway,
  ProductCheckoutInput,
} from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";
import { apiFetch } from "./apiClient";
import { keysToCamelWithPrice, keysToSnake } from "./caseTransform";
import { contextQuery } from "./contextQuery";
import { parsePaginated } from "./parsers";
import { CheckoutSessionResponseSchema, ProductSchema } from "./schemas";

// Same rationale as the plan catalog: the product list rarely changes and
// the upstream response only varies by the currency query param.
const PRODUCT_CACHE_TTL_SECONDS = 60 * 60;

export class DjangoApiProductGateway implements IProductGateway {
  async listProducts(currency?: string): Promise<Product[]> {
    const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
    const data = await apiFetch<Record<string, unknown>>(
      `/billing/products/${query}`,
      { next: { revalidate: PRODUCT_CACHE_TTL_SECONDS } },
    );
    return parsePaginated(data, (r) =>
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
