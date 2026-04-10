import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProductsGrid } from "@/presentation/components/organisms/ProductsGrid";
import type { Product } from "@/domain/models/Product";

const products: Product[] = [
  {
    id: "p1",
    name: "Starter Pack",
    credits: 100,
    price: { id: "price_1", amount: 1000, displayAmount: 10, currency: "usd" },
  } as Product,
  {
    id: "p2",
    name: "Pro Pack",
    credits: 500,
    price: { id: "price_2", amount: 5000, displayAmount: 50, currency: "usd" },
  } as Product,
];

describe("ProductsGrid", () => {
  it("renders the section title", () => {
    render(
      <ProductsGrid
        title="Credit packs"
        products={products}
        creditsLabel="credits"
        locale="en-US"
        renderCta={(p) => <button>Buy {p.name}</button>}
      />,
    );
    expect(screen.getByText("Credit packs")).toBeInTheDocument();
  });

  it("renders one card per product with name, credits, and formatted price", () => {
    render(
      <ProductsGrid
        title="Credit packs"
        products={products}
        creditsLabel="credits"
        locale="en-US"
        renderCta={(p) => <button>Buy {p.name}</button>}
      />,
    );
    expect(screen.getByText("Starter Pack")).toBeInTheDocument();
    expect(screen.getByText("100 credits")).toBeInTheDocument();
    expect(screen.getByText("$10")).toBeInTheDocument();

    expect(screen.getByText("Pro Pack")).toBeInTheDocument();
    expect(screen.getByText("500 credits")).toBeInTheDocument();
    expect(screen.getByText("$50")).toBeInTheDocument();
  });

  it("invokes renderCta for each priced product", () => {
    render(
      <ProductsGrid
        title="Credit packs"
        products={products}
        creditsLabel="credits"
        locale="en-US"
        renderCta={(p) => <button>Buy {p.name}</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Buy Starter Pack" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Buy Pro Pack" }),
    ).toBeInTheDocument();
  });

  it("returns null when there are no products", () => {
    const { container } = render(
      <ProductsGrid
        title="Credit packs"
        products={[]}
        creditsLabel="credits"
        locale="en-US"
        renderCta={() => <button>Buy</button>}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("does not render price or cta when product.price is missing", () => {
    const free: Product[] = [
      {
        id: "p3",
        name: "Free Sample",
        credits: 10,
        price: null,
      } as unknown as Product,
    ];
    render(
      <ProductsGrid
        title="Credit packs"
        products={free}
        creditsLabel="credits"
        locale="en-US"
        renderCta={() => <button>Buy</button>}
      />,
    );
    expect(screen.getByText("Free Sample")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Buy" }),
    ).not.toBeInTheDocument();
  });

  it("forwards a custom className to the wrapper", () => {
    const { container } = render(
      <ProductsGrid
        title="Credit packs"
        products={products}
        creditsLabel="credits"
        locale="en-US"
        renderCta={() => <button>Buy</button>}
        className="custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
