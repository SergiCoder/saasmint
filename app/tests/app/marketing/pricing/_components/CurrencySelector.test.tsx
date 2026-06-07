import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PricingCurrency } from "@/domain/data/pricingCurrencies";

const push = vi.fn();

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/pricing",
  useRouter: () => ({
    push,
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  // Preserve an existing param so the test asserts it is not dropped.
  useSearchParams: () => new URLSearchParams("interval=year"),
}));

import { CurrencySelector } from "@/app/[locale]/(marketing)/pricing/_components/CurrencySelector";

const CURRENCIES: readonly PricingCurrency[] = [
  { code: "eur", symbol: "€", country: "ES" },
  { code: "usd", symbol: "$", country: "US" },
  { code: "chf", symbol: "Fr" },
];

function renderSelector(selected = "usd") {
  return render(
    <CurrencySelector
      label="Currency"
      selected={selected}
      currencies={CURRENCIES}
    />,
  );
}

describe("CurrencySelector", () => {
  beforeEach(() => push.mockClear());

  it("renders a CODE symbol option per currency and no auto-detect row", () => {
    renderSelector();
    expect(screen.getByRole("option", { name: "EUR €" })).toBeDefined();
    expect(screen.getByRole("option", { name: "USD $" })).toBeDefined();
    expect(screen.getByRole("option", { name: "CHF Fr" })).toBeDefined();
    // No empty-value "auto-detect" entry anymore.
    expect(
      screen
        .getAllByRole("option")
        .every((o) => (o as HTMLOptionElement).value),
    ).toBe(true);
  });

  it("renders currencies in the given order (not re-sorted)", () => {
    renderSelector();
    const values = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(values).toEqual(["eur", "usd", "chf"]);
  });

  it("navigates with ?currency= while preserving other params", () => {
    renderSelector();
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "eur" },
    });
    expect(push).toHaveBeenCalledWith("/pricing?interval=year&currency=eur");
  });

  it("reflects the pre-selected currency as the default select value", () => {
    renderSelector("chf");
    const select = screen.getByLabelText("Currency") as HTMLSelectElement;
    expect(select.value).toBe("chf");
  });
});
