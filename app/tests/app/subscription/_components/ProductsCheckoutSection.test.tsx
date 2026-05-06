import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { Product } from "@/domain/models/Product";

// Stub the server action — the section wraps `startProductCheckout` for each
// CTA. We don't care about its behaviour here, just that the form forwards
// the picker selection as `context` when the picker is shown.
vi.mock("@/app/actions/billing", () => ({
  startProductCheckout: vi.fn(),
}));

import { ProductsCheckoutSection } from "@/app/[locale]/(app)/subscription/_components/ProductsCheckoutSection";

const product: Product = {
  id: "prod1",
  name: "200 Credits",
  type: "one_time",
  credits: 200,
  price: {
    id: "pp1",
    amount: 1999,
    displayAmount: 19.99,
    currency: "usd",
    localDisplayAmount: null,
    localCurrency: null,
  },
};

const baseProps = {
  title: "Credit packs",
  products: [product],
  creditsLabel: "credits",
  buyLabel: "Buy",
  locale: "en",
  pickerLabel: "Buy credits for",
  personalOptionLabel: "My personal account",
  teamOptionLabel: "Team Acme",
};

describe("ProductsCheckoutSection", () => {
  it("does not render the picker when showPicker=false", () => {
    render(<ProductsCheckoutSection {...baseProps} showPicker={false} />);

    expect(screen.queryByText("Buy credits for")).not.toBeInTheDocument();
    expect(screen.queryByText("My personal account")).not.toBeInTheDocument();
    expect(screen.queryByText("Team Acme")).not.toBeInTheDocument();
  });

  it("does not forward a context hidden input when showPicker=false", () => {
    // Without the picker, the section must let the backend's account-type
    // default route the request (no `context` query param).
    const { container } = render(
      <ProductsCheckoutSection {...baseProps} showPicker={false} />,
    );

    expect(
      container.querySelector('input[type="hidden"][name="context"]'),
    ).toBeNull();
  });

  it("renders the picker with both options when showPicker=true", () => {
    render(<ProductsCheckoutSection {...baseProps} showPicker={true} />);

    // The picker label appears twice on purpose: a visible h3 (matches the
    // product cards' title weight) plus an sr-only legend that gives the
    // radio fieldset its accessible name. The h3 is `aria-hidden` so it
    // doesn't double-announce, which is why we query for it as a plain
    // heading element rather than via the accessibility tree.
    const heading = document.querySelector('h3[aria-hidden="true"]');
    expect(heading?.textContent).toBe("Buy credits for");
    expect(screen.getByLabelText("My personal account")).toBeInTheDocument();
    expect(screen.getByLabelText("Team Acme")).toBeInTheDocument();
  });

  it("defaults the picker to team to match the backend's org-member default", () => {
    const { container } = render(
      <ProductsCheckoutSection {...baseProps} showPicker={true} />,
    );

    const teamRadio = screen.getByLabelText("Team Acme") as HTMLInputElement;
    expect(teamRadio.checked).toBe(true);

    const ctx = container.querySelector(
      'input[type="hidden"][name="context"]',
    ) as HTMLInputElement | null;
    expect(ctx?.value).toBe("team");
  });

  it("updates the hidden context input when the user selects personal", () => {
    const { container } = render(
      <ProductsCheckoutSection {...baseProps} showPicker={true} />,
    );

    fireEvent.click(screen.getByLabelText("My personal account"));

    const ctx = container.querySelector(
      'input[type="hidden"][name="context"]',
    ) as HTMLInputElement | null;
    expect(ctx?.value).toBe("personal");
  });

  it("renders nothing when there are no products", () => {
    const { container } = render(
      <ProductsCheckoutSection
        {...baseProps}
        products={[]}
        showPicker={true}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("forwards priceSubLabels to ProductsGrid so the local-currency sub-label appears", () => {
    // When the backend returns a product priced in USD but the user's
    // preferred currency is CHF, the page builds a priceSubLabels map via
    // buildProductPriceSubLabels and passes it here. This section must
    // forward it to ProductsGrid without losing the entry.
    render(
      <ProductsCheckoutSection
        {...baseProps}
        showPicker={false}
        priceSubLabels={{ prod1: "≈ CHF 18.45 — billed in USD" }}
      />,
    );

    expect(screen.getByText("≈ CHF 18.45 — billed in USD")).toBeInTheDocument();
  });

  it("does not render a sub-label when priceSubLabels is omitted", () => {
    // Omitting the prop (null localCurrency case) must not produce any
    // disclosure text beneath the price.
    render(<ProductsCheckoutSection {...baseProps} showPicker={false} />);

    // The only price-related text should be the formatted amount itself.
    // No "billed in" disclosure should appear.
    expect(screen.queryByText(/billed in/i)).not.toBeInTheDocument();
  });
});
