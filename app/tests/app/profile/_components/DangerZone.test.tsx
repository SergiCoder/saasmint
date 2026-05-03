import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/[locale]/(app)/profile/_components/DeleteAccountDialog", () => ({
  DeleteAccountDialog: ({ userEmail }: { userEmail: string }) => (
    <div data-testid="delete-dialog">{userEmail}</div>
  ),
}));

import { DangerZone } from "@/app/[locale]/(app)/profile/_components/DangerZone";

describe("DangerZone", () => {
  it("renders only the collapsed delete-account link by default", () => {
    render(<DangerZone userEmail="me@example.com" />);
    expect(
      screen.getByRole("button", { name: "deleteAccount" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("danger")).not.toBeInTheDocument();
  });

  it("expands to show the danger section and the DeleteAccountDialog when the link is clicked", async () => {
    const user = userEvent.setup();
    render(<DangerZone userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));

    expect(screen.getByText("danger")).toBeInTheDocument();
    expect(screen.getByText("deleteConfirm")).toBeInTheDocument();
    expect(screen.getByTestId("delete-dialog")).toHaveTextContent(
      "me@example.com",
    );
  });

  it("blocks deletion with the owner-only message when the user owns an org", async () => {
    const user = userEvent.setup();
    render(<DangerZone userEmail="me@example.com" deleteRestriction="owner" />);

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));

    expect(screen.getByText("deleteBlockedOwner")).toBeInTheDocument();
    expect(screen.queryByTestId("delete-dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("deleteConfirm")).not.toBeInTheDocument();
  });

  it("shows the delete dialog (not the blocked message) for a non-owner with deleteRestriction=undefined", async () => {
    const user = userEvent.setup();
    render(
      <DangerZone userEmail="me@example.com" deleteRestriction={undefined} />,
    );

    await user.click(screen.getByRole("button", { name: "deleteAccount" }));

    expect(screen.getByTestId("delete-dialog")).toHaveTextContent(
      "me@example.com",
    );
    expect(screen.getByText("deleteConfirm")).toBeInTheDocument();
    expect(screen.queryByText("deleteBlockedOwner")).not.toBeInTheDocument();
    expect(screen.queryByText("deleteBlockedMember")).not.toBeInTheDocument();
  });
});
