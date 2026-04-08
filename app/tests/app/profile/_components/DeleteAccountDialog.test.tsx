import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeleteAccount = vi.fn();
vi.mock("@/app/actions/user", () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

const mockReplace = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

import { DeleteAccountDialog } from "@/app/[locale]/(app)/profile/_components/DeleteAccountDialog";

beforeEach(() => {
  mockDeleteAccount.mockReset();
  mockReplace.mockReset();
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  }
});

describe("DeleteAccountDialog", () => {
  it("renders the trigger button labelled 'deleteAccount'", () => {
    render(<DeleteAccountDialog userEmail="me@example.com" />);
    expect(
      screen.getByRole("button", { name: "deleteAccount" }),
    ).toBeInTheDocument();
  });

  it("opens the dialog when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));

    expect(screen.getByText("deleteDialogTitle")).toBeInTheDocument();
    expect(screen.getByText("deleteDialogDescription")).toBeInTheDocument();
    expect(screen.getByLabelText("deleteDialogLabel")).toBeInTheDocument();
  });

  it("shows a mismatch error when the typed email differs from userEmail", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));
    await user.type(
      screen.getByLabelText("deleteDialogLabel"),
      "wrong@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "deleteDialogSubmit" }),
    );

    expect(screen.getByText("deleteDialogMismatch")).toBeInTheDocument();
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it("calls deleteAccount and redirects on success when emails match", async () => {
    mockDeleteAccount.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();
    render(<DeleteAccountDialog userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));
    await user.type(
      screen.getByLabelText("deleteDialogLabel"),
      "me@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "deleteDialogSubmit" }),
    );

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
    });
    expect(mockReplace).toHaveBeenCalledWith("/login?deleted=true");
  });

  it("displays an error and does not redirect when deleteAccount fails", async () => {
    mockDeleteAccount.mockResolvedValueOnce({ error: "boom" });
    const user = userEvent.setup();
    render(<DeleteAccountDialog userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));
    await user.type(
      screen.getByLabelText("deleteDialogLabel"),
      "me@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "deleteDialogSubmit" }),
    );

    await waitFor(() => {
      expect(screen.getByText("deleteDialogError")).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("disables the submit button until the user types something", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));
    const submit = screen.getByRole("button", {
      name: "deleteDialogSubmit",
    });
    expect(submit).toBeDisabled();

    await user.type(screen.getByLabelText("deleteDialogLabel"), "x");
    expect(submit).not.toBeDisabled();
  });

  it("closes the dialog when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteAccountDialog userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.hasAttribute("open")).toBe(true);

    await user.click(
      screen.getByRole("button", { name: "deleteDialogCancel" }),
    );

    expect(dialog.hasAttribute("open")).toBe(false);
  });
});
