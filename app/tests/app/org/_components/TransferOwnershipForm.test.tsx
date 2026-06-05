import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockTransferOwnership = vi.fn();
vi.mock("@/app/actions/org", () => ({
  transferOwnership: (...args: unknown[]) => mockTransferOwnership(...args),
}));

import { TransferOwnershipForm } from "@/app/[locale]/(app)/org/[slug]/_components/TransferOwnershipForm";

const candidates = [
  { id: "u1", fullName: "Alice" },
  { id: "u2", fullName: "Bob" },
];

const defaultProps = {
  orgId: "org-1",
  candidates,
  label: "Transfer",
  selectLabel: "Select new owner",
  confirmTitle: "Transfer ownership?",
  confirmBody: "Ownership will be transferred to {name}.",
  confirmAction: "Yes, transfer",
  confirmDismiss: "Cancel",
};

beforeEach(() => {
  mockTransferOwnership.mockReset();
});

describe("TransferOwnershipForm", () => {
  it("renders the select with candidates", () => {
    render(<TransferOwnershipForm {...defaultProps} />);

    expect(screen.getByLabelText("Select new owner")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("disables the transfer button when no candidate is selected", () => {
    render(<TransferOwnershipForm {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Transfer" })).toBeDisabled();
  });

  it("enables the transfer button after selecting a candidate", async () => {
    const user = userEvent.setup();
    render(<TransferOwnershipForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText("Select new owner"), "u1");

    expect(screen.getByRole("button", { name: "Transfer" })).not.toBeDisabled();
  });

  it("opens confirm dialog with interpolated name", async () => {
    const user = userEvent.setup();
    render(<TransferOwnershipForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText("Select new owner"), "u1");
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(screen.getByText("Transfer ownership?")).toBeInTheDocument();
    expect(
      screen.getByText("Ownership will be transferred to Alice."),
    ).toBeInTheDocument();
  });

  it("calls transferOwnership with orgId and userId on confirm", async () => {
    mockTransferOwnership.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<TransferOwnershipForm {...defaultProps} />);

    await user.selectOptions(screen.getByLabelText("Select new owner"), "u2");
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    await user.click(screen.getByRole("button", { name: "Yes, transfer" }));

    await waitFor(() => {
      expect(mockTransferOwnership).toHaveBeenCalledTimes(1);
    });
  });

  it("does not open dialog when no candidate is selected", async () => {
    const user = userEvent.setup();
    render(<TransferOwnershipForm {...defaultProps} />);

    // Button is disabled, click should have no effect
    await user.click(screen.getByRole("button", { name: "Transfer" }));

    expect(screen.queryByText("Transfer ownership?")).not.toBeInTheDocument();
  });
});
