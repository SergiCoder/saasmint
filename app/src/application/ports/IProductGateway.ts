import type { Product } from "@/domain/models/Product";

export interface ProductCheckoutInput {
  productPriceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface IProductGateway {
  listProducts(currency?: string): Promise<Product[]>;
  createCheckoutSession(input: ProductCheckoutInput): Promise<{ url: string }>;
}
