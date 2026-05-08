import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TypeToConfirmDialog } from "@/presentation/components/molecules/TypeToConfirmDialog";

/**
 * jsdom does not implement the native `<dialog>` element APIs. Stub them on
 * the prototype so every `<dialog>` gets them. Our stubs toggle the `open`
 * attribute to mirror browser behaviour, letting tests assert on that attribute
 * for dialog open/close state.
 */
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
  vi.clearAllMocks();
});

function getDialog() {
  return document.querySelector("dialog")!;
}

const defaultProps = {
  triggerLabel: "Delete",
  title: "Confirm deletion",
  description: "This action cannot be undone.",
  inputLabel: "Type your email to confirm",
  inputPlaceholder: "you@example.com",
  expectedValue: "you@example.com",
  mismatchError: "Value does not match",
  cancelLabel: "Cancel",
  submitLabel: "Confirm",
  onConfirm: vi.fn<() => Promise<string | null>>(),
};

describe("TypeToConfirmDialog", () => {
  it("dialog is closed (no open attribute) on initial render", () => {
    render(<TypeToConfirmDialog {...defaultProps} />);

    // The dialog element exists in the DOM but is not open
    expect(getDialog()).not.toHaveAttribute("open");
  });

  it("renders the trigger button regardless of dialog state", () => {
    render(<TypeToConfirmDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("opens the dialog (sets open attribute) when the trigger button is clicked", async () => {
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(getDialog()).toHaveAttribute("open");
  });

  it("renders the dialog title and description", async () => {
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByText("Confirm deletion")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("submit button is disabled when the input is empty", async () => {
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    // value.length === 0 → submit disabled
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("shows a mismatch error when submitted with a wrong value", async () => {
    defaultProps.onConfirm.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const input = screen.getByPlaceholderText("you@example.com");
    await user.type(input, "wrong@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByText("Value does not match")).toBeInTheDocument();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when submitted with the correct value", async () => {
    defaultProps.onConfirm.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const input = screen.getByPlaceholderText("you@example.com");
    await user.type(input, "you@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
    });
  });

  it("displays the error returned by onConfirm on server-side failure", async () => {
    defaultProps.onConfirm.mockResolvedValue("Server-side error occurred");
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const input = screen.getByPlaceholderText("you@example.com");
    await user.type(input, "you@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.getByText("Server-side error occurred"),
      ).toBeInTheDocument();
    });
  });

  it("closes the dialog (removes open attribute) when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(getDialog()).toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(getDialog()).not.toHaveAttribute("open");
    });
  });

  it("uses email input type when inputType=email is specified", async () => {
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} inputType="email" />);

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByPlaceholderText("you@example.com")).toHaveAttribute(
      "type",
      "email",
    );
  });

  it("defaults to text input type when inputType is not specified", async () => {
    const user = userEvent.setup();
    render(
      <TypeToConfirmDialog
        {...defaultProps}
        inputPlaceholder="type org name"
        expectedValue="my-org"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByPlaceholderText("type org name")).toHaveAttribute(
      "type",
      "text",
    );
  });

  it("clears the mismatch error when the user corrects the value and re-submits", async () => {
    defaultProps.onConfirm.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<TypeToConfirmDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const input = screen.getByPlaceholderText("you@example.com");

    // Submit with wrong value first
    await user.type(input, "wrong@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(screen.getByText("Value does not match")).toBeInTheDocument();

    // Clear input and type the correct value
    await user.clear(input);
    await user.type(input, "you@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Value does not match"),
      ).not.toBeInTheDocument();
      expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
    });
  });
});
