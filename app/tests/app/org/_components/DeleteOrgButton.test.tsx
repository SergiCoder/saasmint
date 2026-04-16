import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeleteOrg = vi.fn();
vi.mock("@/app/actions/org", () => ({
  deleteOrg: (...args: unknown[]) => mockDeleteOrg(...args),
}));

import { DeleteOrgButton } from "@/app/[locale]/(app)/org/[slug]/_components/DeleteOrgButton";

const defaultProps = {
  orgId: "org-1",
  label: "Delete organization",
  confirmTitle: "Delete this org?",
  confirmBody: "This action cannot be undone.",
  confirmAction: "Delete",
  confirmDismiss: "Cancel",
};

beforeEach(() => {
  mockDeleteOrg.mockReset();
});

describe("DeleteOrgButton", () => {
  it("renders the trigger button", () => {
    render(<DeleteOrgButton {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Delete organization" }),
    ).toBeInTheDocument();
  });

  it("opens the confirm dialog when clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteOrgButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );

    expect(screen.getByText("Delete this org?")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls deleteOrg with orgId when confirmed", async () => {
    mockDeleteOrg.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<DeleteOrgButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockDeleteOrg).toHaveBeenCalledTimes(1);
    });

    const formData = mockDeleteOrg.mock.calls[0][0] as FormData;
    expect(formData.get("orgId")).toBe("org-1");
  });

  it("shows error when deleteOrg throws", async () => {
    mockDeleteOrg.mockRejectedValueOnce(new Error("Server error"));
    const user = userEvent.setup();
    render(<DeleteOrgButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  it("shows fallback error for non-Error throws", async () => {
    mockDeleteOrg.mockRejectedValueOnce("oops");
    const user = userEvent.setup();
    render(<DeleteOrgButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });
  });

  it("clears error when re-opening the dialog", async () => {
    mockDeleteOrg.mockRejectedValueOnce(new Error("Server error"));
    const user = userEvent.setup();
    render(<DeleteOrgButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });

    // Re-open should clear the error
    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );

    expect(screen.queryByText("Server error")).not.toBeInTheDocument();
  });

  it("dismisses the dialog when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<DeleteOrgButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: "Delete organization" }),
    );
    expect(screen.getByText("Delete this org?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Delete this org?")).not.toBeInTheDocument();
  });
});
