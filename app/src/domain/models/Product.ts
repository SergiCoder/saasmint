import type { Price } from "./Price";

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly type: "one_time";
  readonly credits: number;
  readonly price: Price | null;
}
