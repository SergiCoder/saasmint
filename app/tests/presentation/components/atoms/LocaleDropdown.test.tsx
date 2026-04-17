import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const mockReplace = vi.fn();

vi.mock("next-intl", () => ({
  useLocale: () => "en",
}));

vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/i18n/routing", () => {
  const locales = ["en", "es", "fr"];
  return {
    routing: {
      locales,
      defaultLocale: "en",
    },
    isLocale: (value: unknown) =>
      typeof value === "string" && locales.includes(value),
  };
});

import { LocaleDropdown } from "@/presentation/components/atoms/LocaleDropdown";

describe("LocaleDropdown", () => {
  it("renders the current locale in uppercase", () => {
    render(<LocaleDropdown />);
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("renders a button with aria-haspopup", () => {
    render(<LocaleDropdown />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-haspopup", "listbox");
  });

  it("starts with dropdown closed", () => {
    render(<LocaleDropdown />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the dropdown on click", async () => {
    const user = userEvent.setup();
    render(<LocaleDropdown />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows locale options when open", async () => {
    const user = userEvent.setup();
    render(<LocaleDropdown />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Español")).toBeInTheDocument();
    expect(screen.getByText("Français")).toBeInTheDocument();
  });

  it("marks current locale as selected", async () => {
    const user = userEvent.setup();
    render(<LocaleDropdown />);

    await user.click(screen.getByRole("button"));

    const englishOption = screen.getByRole("option", { name: "English" });
    expect(englishOption).toHaveAttribute("aria-selected", "true");

    const spanishOption = screen.getByRole("option", { name: "Español" });
    expect(spanishOption).toHaveAttribute("aria-selected", "false");
  });

  it("calls router.replace with selected locale and closes dropdown", async () => {
    const user = userEvent.setup();
    render(<LocaleDropdown />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: "Español" }));

    expect(mockReplace).toHaveBeenCalledWith("/dashboard", { locale: "es" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown on second toggle click", async () => {
    const user = userEvent.setup();
    render(<LocaleDropdown />);
    const button = screen.getByRole("button");

    await user.click(button);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <LocaleDropdown />
        <p>Outside</p>
      </div>,
    );

    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByText("Outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
