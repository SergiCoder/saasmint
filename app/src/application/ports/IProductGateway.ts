import type { Product } from "@/domain/models/Product";

export interface IProductGateway {
  listProducts(): Promise<Product[]>;
}
