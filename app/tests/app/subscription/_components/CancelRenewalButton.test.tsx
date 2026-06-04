import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCancelRenewal = vi.fn();
vi.mock("@/app/actions/billing", () => ({
  cancelRenewal: (...args: unknown[]) => mockCancelRenewal(...args),
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
  mockCancelRenewal.mockReset();
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

  it("calls cancelRenewal when confirm is clicked", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(mockCancelRenewal).toHaveBeenCalledTimes(1);
    });
  });

  it("closes the dialog after a successful confirmation", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
    });
  });

  it("renders the translated error code when the action fails", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: false, code: "HTTP_500" });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    // i18n stub falls back to "unknown_error" because actionErrors is empty.
    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
  });

  it("keeps the dialog open when the action returns an error", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: false, code: "HTTP_500" });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("falls back to the unknown_error translation when only an unknown code is returned", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: false, code: "HTTP_500" });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
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

  it("forwards context=personal to cancelRenewal when the prop is set", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} context="personal" />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(mockCancelRenewal).toHaveBeenCalledWith("personal");
    });
  });

  it("forwards context=team to cancelRenewal when the prop is set", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} context="team" />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(mockCancelRenewal).toHaveBeenCalledWith("team");
    });
  });

  it("calls cancelRenewal without context when the prop is omitted", async () => {
    mockCancelRenewal.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<CancelRenewalButton {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Cancel renewal" }));
    await user.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => {
      expect(mockCancelRenewal).toHaveBeenCalledWith(undefined);
    });
  });
});
