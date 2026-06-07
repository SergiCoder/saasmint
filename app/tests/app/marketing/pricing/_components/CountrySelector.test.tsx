import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const push = vi.fn();

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/pricing",
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  // Preserve an existing param so the test asserts it is not dropped.
  useSearchParams: () => new URLSearchParams("interval=year"),
}));

import { CountrySelector } from "@/app/[locale]/(marketing)/pricing/_components/CountrySelector";

function renderSelector(selected = "") {
  return render(
    <CountrySelector
      label="Country"
      autoLabel="Auto-detect"
      selected={selected}
      countries={["US", "ES", "FR"]}
      locale="en"
    />,
  );
}

describe("CountrySelector", () => {
  beforeEach(() => push.mockClear());

  it("renders the auto-detect option plus a localised name per country", () => {
    renderSelector();
    expect(screen.getByRole("option", { name: "Auto-detect" })).toBeDefined();
    // Intl.DisplayNames localises the codes; sorted alphabetically in-locale.
    expect(screen.getByRole("option", { name: "France" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Spain" })).toBeDefined();
    expect(screen.getByRole("option", { name: "United States" })).toBeDefined();
  });

  it("navigates with ?country= while preserving other params", () => {
    renderSelector();
    fireEvent.change(screen.getByLabelText("Country"), {
      target: { value: "ES" },
    });
    expect(push).toHaveBeenCalledWith("/pricing?interval=year&country=ES");
  });

  it("drops ?country= when auto-detect is selected", () => {
    renderSelector("ES");
    fireEvent.change(screen.getByLabelText("Country"), {
      target: { value: "" },
    });
    expect(push).toHaveBeenCalledWith("/pricing?interval=year");
  });
});
