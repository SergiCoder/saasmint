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
  { code: "eur", country: "ES", symbol: "€" },
  { code: "usd", country: "US", symbol: "$" },
  { code: "gbp", country: "GB", symbol: "£" },
];

function renderSelector(selected = "") {
  return render(
    <CurrencySelector
      label="Currency"
      autoLabel="Auto-detect"
      selected={selected}
      currencies={CURRENCIES}
    />,
  );
}

describe("CurrencySelector", () => {
  beforeEach(() => push.mockClear());

  it("renders the auto-detect option plus a CODE symbol per currency", () => {
    renderSelector();
    expect(screen.getByRole("option", { name: "Auto-detect" })).toBeDefined();
    expect(screen.getByRole("option", { name: "EUR €" })).toBeDefined();
    expect(screen.getByRole("option", { name: "USD $" })).toBeDefined();
    expect(screen.getByRole("option", { name: "GBP £" })).toBeDefined();
  });

  it("renders currencies in the given order (not re-sorted)", () => {
    renderSelector();
    const values = screen
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value)
      .filter((v) => v !== ""); // skip auto-detect
    expect(values).toEqual(["eur", "usd", "gbp"]);
  });

  it("navigates with ?currency= while preserving other params", () => {
    renderSelector();
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "eur" },
    });
    expect(push).toHaveBeenCalledWith("/pricing?interval=year&currency=eur");
  });

  it("drops ?currency= when auto-detect is selected", () => {
    renderSelector("eur");
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "" },
    });
    expect(push).toHaveBeenCalledWith("/pricing?interval=year");
  });

  it("reflects the selected currency as the default select value", () => {
    renderSelector("gbp");
    const select = screen.getByLabelText("Currency") as HTMLSelectElement;
    expect(select.value).toBe("gbp");
  });
});
