import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/auth", () => ({
  updatePassword: vi.fn(),
}));

import { ChangePasswordForm } from "@/app/[locale]/(app)/profile/_components/ChangePasswordForm";

describe("ChangePasswordForm", () => {
  it("renders the password fields and submit button", () => {
    render(<ChangePasswordForm />);

    expect(screen.getByLabelText(/newPassword/)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmPassword/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "passwordChangeSubmit" }),
    ).toBeInTheDocument();
  });

  it("requires both password fields with minLength 8 and uses new-password autocomplete", () => {
    render(<ChangePasswordForm />);

    const password = screen.getByLabelText(/newPassword/) as HTMLInputElement;
    const confirm = screen.getByLabelText(/confirmPassword/) as HTMLInputElement;

    expect(password).toBeRequired();
    expect(confirm).toBeRequired();
    expect(password).toHaveAttribute("type", "password");
    expect(confirm).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("minLength", "8");
    expect(confirm).toHaveAttribute("minLength", "8");
    expect(password).toHaveAttribute("autoComplete", "new-password");
    expect(confirm).toHaveAttribute("autoComplete", "new-password");
  });

  it("disables the submit button until the form has been touched", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordForm />);

    const submit = screen.getByRole("button", {
      name: "passwordChangeSubmit",
    });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText(/newPassword/), "a");
    expect(submit).not.toBeDisabled();
  });
});
