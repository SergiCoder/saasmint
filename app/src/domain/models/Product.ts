import type { ProductPrice } from "./ProductPrice";

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly type: "one_time";
  readonly credits: number;
  readonly price: ProductPrice | null;
}
