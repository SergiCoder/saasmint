import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockReleaseScheduledChange = vi.fn();

vi.mock("@/app/actions/billing", () => ({
  releaseScheduledChange: (...args: unknown[]) =>
    mockReleaseScheduledChange(...args),
}));

import { ReleaseScheduledChangeButton } from "@/app/[locale]/(app)/subscription/_components/ReleaseScheduledChangeButton";

describe("ReleaseScheduledChangeButton", () => {
  it("renders a button labelled with the children", () => {
    render(
      <ReleaseScheduledChangeButton>Keep Pro</ReleaseScheduledChangeButton>,
    );
    expect(
      screen.getByRole("button", { name: "Keep Pro" }),
    ).toBeInTheDocument();
  });

  it("uses the primary variant", () => {
    render(
      <ReleaseScheduledChangeButton>Keep Pro</ReleaseScheduledChangeButton>,
    );
    const button = screen.getByRole("button", { name: "Keep Pro" });
    expect(button.className).toMatch(/bg-primary|primary/);
  });

  it("calls releaseScheduledChange with no context when context is omitted", async () => {
    mockReleaseScheduledChange.mockResolvedValue({ ok: true });

    render(
      <ReleaseScheduledChangeButton>Keep Pro</ReleaseScheduledChangeButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Keep Pro" }));

    await waitFor(() => {
      expect(mockReleaseScheduledChange).toHaveBeenCalledWith(undefined);
    });
  });

  it("calls releaseScheduledChange with the supplied context", async () => {
    mockReleaseScheduledChange.mockResolvedValue({ ok: true });

    render(
      <ReleaseScheduledChangeButton context="personal">
        Keep Pro
      </ReleaseScheduledChangeButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Keep Pro" }));

    await waitFor(() => {
      expect(mockReleaseScheduledChange).toHaveBeenCalledWith("personal");
    });
  });

  it("shows an error message when the action fails", async () => {
    mockReleaseScheduledChange.mockResolvedValue({
      ok: false,
      code: "not_billing_member",
    });

    render(
      <ReleaseScheduledChangeButton>Keep Pro</ReleaseScheduledChangeButton>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Keep Pro" }));

    await waitFor(() => {
      // useActionErrorMessage falls back to t("unknown_error") when the code
      // is not in the messages map; the i18n stub echoes the key.
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
  });

  it("clears the error message on subsequent click before re-running", async () => {
    mockReleaseScheduledChange
      .mockResolvedValueOnce({ ok: false, code: "not_billing_member" })
      .mockResolvedValueOnce({ ok: true });

    render(
      <ReleaseScheduledChangeButton>Keep Pro</ReleaseScheduledChangeButton>,
    );

    const button = screen.getByRole("button", { name: "Keep Pro" });

    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByText("unknown_error")).toBeInTheDocument(),
    );

    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.queryByText("unknown_error")).not.toBeInTheDocument(),
    );
  });
});
