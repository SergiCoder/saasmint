import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PronounsPicker } from "@/presentation/components/molecules/PronounsPicker";

/**
 * Minimal translate stub that returns the key verbatim, matching the global
 * setup. We alias known pronoun keys to predictable strings so assertions
 * can target rendered option text without knowing translation file contents.
 */
const t = (key: string): string => {
  const map: Record<string, string> = {
    pronouns: "Pronouns",
    pronounsHeHim: "He/Him",
    pronounsSheHer: "She/Her",
    pronounsTheyThem: "They/Them",
    pronounsDontSpecify: "Prefer not to say",
    pronounsCustom: "Custom",
    pronounsCustomPlaceholder: "Enter your pronouns",
  };
  return map[key] ?? key;
};

describe("PronounsPicker", () => {
  it("renders the label and select element", () => {
    render(<PronounsPicker t={t} />);

    expect(screen.getByLabelText("Pronouns")).toBeInTheDocument();
  });

  it("shows the standard pronoun options and a custom option", () => {
    render(<PronounsPicker t={t} />);

    expect(
      screen.getByRole("option", { name: "Prefer not to say" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "He/Him" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "She/Her" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "They/Them" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Custom" })).toBeInTheDocument();
  });

  it("starts with blank selection (don't specify) when defaultValue is null", () => {
    render(<PronounsPicker t={t} defaultValue={null} />);
    const select = screen.getByLabelText("Pronouns") as HTMLSelectElement;
    expect(select.value).toBe("");
  });

  it("pre-selects a known pronoun when defaultValue matches a standard option", () => {
    render(<PronounsPicker t={t} defaultValue="He/Him" />);
    const select = screen.getByLabelText("Pronouns") as HTMLSelectElement;
    expect(select.value).toBe("He/Him");
  });

  it("selects the custom sentinel and shows the free-text input when defaultValue is a custom string", () => {
    render(<PronounsPicker t={t} defaultValue="ze/zir" />);

    const select = screen.getByLabelText("Pronouns") as HTMLSelectElement;
    expect(select.value).toBe("__custom__");

    const customInput = screen.getByPlaceholderText(
      "Enter your pronouns",
    ) as HTMLInputElement;
    expect(customInput.value).toBe("ze/zir");
  });

  it("shows the free-text input when custom option is selected", async () => {
    const user = userEvent.setup();
    render(<PronounsPicker t={t} />);

    expect(
      screen.queryByPlaceholderText("Enter your pronouns"),
    ).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Pronouns"),
      screen.getByRole("option", { name: "Custom" }),
    );

    expect(
      screen.getByPlaceholderText("Enter your pronouns"),
    ).toBeInTheDocument();
  });

  it("hides the free-text input when switching away from custom", async () => {
    const user = userEvent.setup();
    render(<PronounsPicker t={t} defaultValue="ze/zir" />);

    // Currently on custom; switch to a standard option
    await user.selectOptions(
      screen.getByLabelText("Pronouns"),
      screen.getByRole("option", { name: "She/Her" }),
    );

    expect(
      screen.queryByPlaceholderText("Enter your pronouns"),
    ).not.toBeInTheDocument();
  });

  it("calls onDirty when the select changes", async () => {
    const onDirty = vi.fn();
    const user = userEvent.setup();
    render(<PronounsPicker t={t} onDirty={onDirty} />);

    await user.selectOptions(
      screen.getByLabelText("Pronouns"),
      screen.getByRole("option", { name: "He/Him" }),
    );

    expect(onDirty).toHaveBeenCalledOnce();
  });

  it("calls onDirty when the custom text input changes", async () => {
    const onDirty = vi.fn();
    const user = userEvent.setup();
    render(<PronounsPicker t={t} defaultValue="ze/zir" onDirty={onDirty} />);

    const customInput = screen.getByPlaceholderText("Enter your pronouns");
    await user.type(customInput, "x");

    expect(onDirty).toHaveBeenCalled();
  });

  it("does not render the custom input when custom is not selected and no custom defaultValue", () => {
    render(<PronounsPicker t={t} defaultValue="She/Her" />);
    expect(
      screen.queryByPlaceholderText("Enter your pronouns"),
    ).not.toBeInTheDocument();
  });

  it("does not call onDirty when rendering with a default value (no user interaction)", () => {
    const onDirty = vi.fn();
    render(<PronounsPicker t={t} defaultValue="He/Him" onDirty={onDirty} />);
    expect(onDirty).not.toHaveBeenCalled();
  });
});
