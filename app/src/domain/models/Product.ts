import type { ProductPrice } from "./ProductPrice";

export interface Product {
  id: string;
  name: string;
  type: "one_time";
  credits: number;
  price: ProductPrice | null;
}
