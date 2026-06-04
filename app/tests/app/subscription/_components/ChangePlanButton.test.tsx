import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChangePlan = vi.fn();
vi.mock("@/app/actions/billing", () => ({
  changePlan: (...args: unknown[]) => mockChangePlan(...args),
}));

const mockRouterRefresh = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

import { ChangePlanButton } from "@/app/[locale]/(app)/subscription/_components/ChangePlanButton";

const defaultProps = {
  planPriceId: "price_pro_monthly",
  isDeferred: false,
  confirmTitle: "Switch to Pro?",
  confirmBody: "You will be charged $19/month immediately.",
  confirmAction: "Confirm",
  confirmDismiss: "Cancel",
};

beforeEach(() => {
  mockChangePlan.mockReset();
  mockRouterRefresh.mockReset();
});

describe("ChangePlanButton", () => {
  it("renders the trigger button with the provided children", () => {
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);
    expect(screen.getByRole("button", { name: "Upgrade" })).toBeInTheDocument();
  });

  it("uses the secondary variant when highlighted is false (default)", () => {
    render(<ChangePlanButton {...defaultProps}>Switch</ChangePlanButton>);
    expect(screen.getByRole("button", { name: "Switch" })).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });

  it("uses the primary variant when highlighted is true", () => {
    render(
      <ChangePlanButton {...defaultProps} highlighted>
        Upgrade to Pro
      </ChangePlanButton>,
    );
    expect(
      screen.getByRole("button", { name: "Upgrade to Pro" }),
    ).toHaveAttribute("data-variant", "primary");
  });

  it("opens the confirm dialog when the trigger button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));

    expect(screen.getByText("Switch to Pro?")).toBeInTheDocument();
    expect(
      screen.getByText("You will be charged $19/month immediately."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls changePlan with planPriceId and no context when confirm is clicked", async () => {
    mockChangePlan.mockResolvedValueOnce({
      ok: true,
      data: { deferred: false },
    });
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockChangePlan).toHaveBeenCalledWith(
        "price_pro_monthly",
        undefined,
      );
    });
  });

  it("passes the context prop to changePlan when supplied", async () => {
    mockChangePlan.mockResolvedValueOnce({
      ok: true,
      data: { deferred: false },
    });
    const user = userEvent.setup();
    render(
      <ChangePlanButton {...defaultProps} context="personal">
        Downgrade
      </ChangePlanButton>,
    );

    await user.click(screen.getByRole("button", { name: "Downgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockChangePlan).toHaveBeenCalledWith(
        "price_pro_monthly",
        "personal",
      );
    });
  });

  it("passes context=team when targeting the team subscription", async () => {
    mockChangePlan.mockResolvedValueOnce({
      ok: true,
      data: { deferred: true },
    });
    const user = userEvent.setup();
    render(
      <ChangePlanButton {...defaultProps} context="team">
        Downgrade
      </ChangePlanButton>,
    );

    await user.click(screen.getByRole("button", { name: "Downgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockChangePlan).toHaveBeenCalledWith("price_pro_monthly", "team");
    });
  });

  it("calls router.refresh and closes the dialog on success", async () => {
    mockChangePlan.mockResolvedValueOnce({
      ok: true,
      data: { deferred: false },
    });
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText("Switch to Pro?")).not.toBeInTheDocument();
  });

  it("displays an error message and keeps the dialog open on failure", async () => {
    mockChangePlan.mockResolvedValueOnce({ ok: false, code: "HTTP_500" });
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    // i18n stub falls back to "unknown_error" because actionErrors is empty.
    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
    expect(screen.getByText("Switch to Pro?")).toBeInTheDocument();
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("falls back to the unknown_error translation when only a code is returned", async () => {
    mockChangePlan.mockResolvedValueOnce({ ok: false, code: "HTTP_500" });
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
  });

  it("dismisses the dialog when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));
    expect(screen.getByText("Switch to Pro?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Switch to Pro?")).not.toBeInTheDocument();
  });

  it("does not call router.refresh when the action fails", async () => {
    mockChangePlan.mockResolvedValueOnce({ ok: false, code: "HTTP_409" });
    const user = userEvent.setup();
    render(<ChangePlanButton {...defaultProps}>Upgrade</ChangePlanButton>);

    await user.click(screen.getByRole("button", { name: "Upgrade" }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });
});
