import type { Product } from "@/domain/models/Product";

export interface IProductGateway {
  listProducts(currency?: string): Promise<Product[]>;
}
