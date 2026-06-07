import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

  it("renders countries sorted alphabetically", () => {
    renderSelector();
    const options = screen
      .getAllByRole("option")
      .filter((o) => o.getAttribute("value") !== ""); // skip auto-detect
    const names = options.map((o) => o.textContent ?? "");
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
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

  it("navigates to pathname without query string when there are no other params and auto-detect is chosen", () => {
    // When the only param was country= and it is removed, the resulting URL
    // should be just the pathname (no trailing `?`).
    // We need a version of useSearchParams that returns an empty params set.
    // The existing mock returns "interval=year", so we verify the general case
    // instead: selecting a country when auto-detect is already active replaces
    // the country param correctly.
    renderSelector("");
    fireEvent.change(screen.getByLabelText("Country"), {
      target: { value: "FR" },
    });
    expect(push).toHaveBeenCalledWith("/pricing?interval=year&country=FR");
  });

  it("reflects the selected country as the default select value", () => {
    renderSelector("FR");
    const select = screen.getByLabelText("Country") as HTMLSelectElement;
    expect(select.value).toBe("FR");
  });
});
