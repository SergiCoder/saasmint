import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCancelSubscription = vi.fn();
vi.mock("@/app/actions/billing", () => ({
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
}));

import { CancelRenewalButton } from "@/app/[locale]/(app)/subscription/_components/CancelRenewalButton";

const defaultProps = {
  label: "Cancel renewal",
  confirmTitle: "Are you sure?",
  confirmBody: "Renewal will stop on Jan 1, 2030.",
  confirmAction: "Yes, cancel",
  confirmDismiss: "Keep subscription",
};

beforeEach(() => {
  mockCancelSubscription.mockReset();
});

describe("CancelRenewalButton", () => {
  it("renders the trigger label", () => {
    render(<CancelRenewalButton {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Cancel renewal" }),
    ).toBeInTheDocument();
  });

  it("opens the dialog with title, body, and confirmation buttons", async () => {
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));

    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByText("Renewal will stop on Jan 1, 2030."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Yes, cancel" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep subscription" }),
    ).toBeInTheDocument();
  });

  it("calls cancelSubscription when confirm is clicked", async () => {
    mockCancelSubscription.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(mockCancelSubscription).toHaveBeenCalledTimes(1);
    });
  });

  it("closes the dialog after a successful confirmation", async () => {
    mockCancelSubscription.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
    });
  });

  it("displays the error returned by cancelSubscription", async () => {
    mockCancelSubscription.mockResolvedValueOnce({
      ok: false,
      error: "boom",
    });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.getByText("boom")).toBeInTheDocument();
    });
  });

  it("keeps the dialog open when the action returns an error", async () => {
    mockCancelSubscription.mockResolvedValueOnce({
      ok: false,
      error: "nope",
    });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.getByText("nope")).toBeInTheDocument();
    });
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("displays a fallback error when the action throws a non-Error", async () => {
    mockCancelSubscription.mockRejectedValueOnce("nope");
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.getByText("Unknown error")).toBeInTheDocument();
    });
  });

  it("dismisses the dialog when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep subscription" }));
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });
});
