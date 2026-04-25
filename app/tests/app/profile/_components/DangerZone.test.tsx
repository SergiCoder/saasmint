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
});
