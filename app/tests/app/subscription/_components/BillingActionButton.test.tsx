import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRouterRefresh = vi.fn();

vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

import { BillingActionButton } from "@/app/[locale]/(app)/subscription/_components/BillingActionButton";
import type { SubscriptionContext } from "@/application/ports/ISubscriptionGateway";
import type { ActionResult } from "@/lib/actions/ActionResult";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BillingActionButton", () => {
  it("renders a button with the provided children label", () => {
    render(
      <BillingActionButton action={vi.fn()} context={undefined}>
        Resume subscription
      </BillingActionButton>,
    );

    expect(
      screen.getByRole("button", { name: "Resume subscription" }),
    ).toBeInTheDocument();
  });

  it("uses the primary variant", () => {
    render(<BillingActionButton action={vi.fn()}>Go</BillingActionButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute(
      "data-variant",
      "primary",
    );
  });

  it("calls the action with no context when context prop is omitted", async () => {
    const action = vi
      .fn<(context?: SubscriptionContext) => Promise<ActionResult>>()
      .mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<BillingActionButton action={action}>Click me</BillingActionButton>);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith(undefined);
    });
  });

  it("forwards the context prop to the action", async () => {
    const action = vi
      .fn<(context?: SubscriptionContext) => Promise<ActionResult>>()
      .mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(
      <BillingActionButton action={action} context="team">
        Click me
      </BillingActionButton>,
    );

    await user.click(screen.getByRole("button", { name: "Click me" }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith("team");
    });
  });

  it("calls router.refresh after a successful action", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<BillingActionButton action={action}>Click</BillingActionButton>);

    await user.click(screen.getByRole("button", { name: "Click" }));

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledOnce();
    });
  });

  it("does not call router.refresh when the action fails", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false,
      code: "HTTP_500",
    });
    const user = userEvent.setup();

    render(<BillingActionButton action={action}>Click</BillingActionButton>);

    await user.click(screen.getByRole("button", { name: "Click" }));

    await waitFor(() => {
      // i18n stub echoes the key; the hook falls back to "unknown_error".
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("renders the translated unknown_error key when the action fails", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false,
      code: "some_unknown_code",
    });
    const user = userEvent.setup();

    render(<BillingActionButton action={action}>Click</BillingActionButton>);

    await user.click(screen.getByRole("button", { name: "Click" }));

    await waitFor(() => {
      // The i18n stub echoes the key; the hook falls back to "unknown_error"
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
  });

  it("clears the error message on a subsequent successful click", async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: "billing_error" })
      .mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();

    render(<BillingActionButton action={action}>Click</BillingActionButton>);

    const button = screen.getByRole("button", { name: "Click" });
    await user.click(button);
    await waitFor(() =>
      expect(screen.getByText("unknown_error")).toBeInTheDocument(),
    );

    await user.click(button);
    await waitFor(() =>
      expect(screen.queryByText("unknown_error")).not.toBeInTheDocument(),
    );
  });
});
