import type { IProductGateway } from "@/application/ports/IProductGateway";
import type { Product } from "@/domain/models/Product";

export class ListProducts {
  constructor(private readonly products: IProductGateway) {}

  async execute(currency?: string): Promise<Product[]> {
    return this.products.listProducts(currency);
  }
}
