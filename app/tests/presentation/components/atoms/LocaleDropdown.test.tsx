import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockReplace = vi.fn();
const mockUpdatePreferredLocale = vi.fn();

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

vi.mock("@/app/actions/user", () => ({
  updatePreferredLocale: (...args: unknown[]) =>
    mockUpdatePreferredLocale(...args),
}));

import { LocaleDropdown } from "@/presentation/components/atoms/LocaleDropdown";

beforeEach(() => {
  mockReplace.mockClear();
  mockUpdatePreferredLocale.mockReset();
  mockUpdatePreferredLocale.mockResolvedValue(undefined);
});

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

  it("calls updatePreferredLocale with the chosen locale", async () => {
    const user = userEvent.setup();
    render(<LocaleDropdown />);

    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("option", { name: "Français" }));

    await waitFor(() => {
      expect(mockUpdatePreferredLocale).toHaveBeenCalledWith("fr");
    });
  });

  it("does not crash when updatePreferredLocale rejects (fire-and-forget catch)", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const rejection = new Error("server 500");
    mockUpdatePreferredLocale.mockRejectedValue(rejection);

    const user = userEvent.setup();
    render(<LocaleDropdown />);

    await user.click(screen.getByRole("button"));
    // The click handler must not throw even though the server action rejects.
    await user.click(screen.getByRole("option", { name: "Español" }));

    // Visual swap happened regardless of the failed save.
    expect(mockReplace).toHaveBeenCalledWith("/dashboard", { locale: "es" });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save preferred locale",
        rejection,
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
