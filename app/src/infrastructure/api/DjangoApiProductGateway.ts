import type { IProductGateway } from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";
import { apiFetch } from "./apiClient";

export class DjangoApiProductGateway implements IProductGateway {
  async listProducts(): Promise<Product[]> {
    return apiFetch<Product[]>("/billing/products/");
  }
}
