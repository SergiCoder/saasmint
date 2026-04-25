import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateSeats = vi.fn();
vi.mock("@/app/actions/billing", () => ({
  updateSeats: (...args: unknown[]) => mockUpdateSeats(...args),
}));

import { SeatManager } from "@/app/[locale]/(app)/org/[slug]/_components/SeatManager";

beforeEach(() => {
  mockUpdateSeats.mockReset();
});

describe("SeatManager", () => {
  it("renders the current seat count", () => {
    render(<SeatManager currentSeats={5} usedSeats={3} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("disables the decrease button when seats equal used seats", () => {
    render(<SeatManager currentSeats={3} usedSeats={3} />);
    // The remove seat button uses the translation key as label
    expect(screen.getByLabelText("removeSeat")).toBeDisabled();
  });

  it("enables the decrease button when seats exceed used seats", () => {
    render(<SeatManager currentSeats={5} usedSeats={3} />);
    expect(screen.getByLabelText("removeSeat")).not.toBeDisabled();
  });

  it("disables the update button when seat count has not changed", () => {
    render(<SeatManager currentSeats={5} usedSeats={3} />);
    expect(screen.getByRole("button", { name: "updateSeats" })).toBeDisabled();
  });

  it("enables the update button after incrementing", async () => {
    const user = userEvent.setup();
    render(<SeatManager currentSeats={5} usedSeats={3} />);

    await user.click(screen.getByLabelText("addSeat"));

    expect(screen.getByText("6")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "updateSeats" }),
    ).not.toBeDisabled();
  });

  it("enables the update button after decrementing", async () => {
    const user = userEvent.setup();
    render(<SeatManager currentSeats={5} usedSeats={3} />);

    await user.click(screen.getByLabelText("removeSeat"));

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "updateSeats" }),
    ).not.toBeDisabled();
  });

  it("submits directly when increasing seats", async () => {
    mockUpdateSeats.mockResolvedValueOnce({ ok: true });
    const user = userEvent.setup();
    render(<SeatManager currentSeats={5} usedSeats={3} />);

    await user.click(screen.getByLabelText("addSeat"));
    await user.click(screen.getByRole("button", { name: "updateSeats" }));

    await waitFor(() => {
      expect(mockUpdateSeats).toHaveBeenCalledTimes(1);
    });
  });

  it("opens confirm dialog when decreasing seats", async () => {
    const user = userEvent.setup();
    render(<SeatManager currentSeats={5} usedSeats={3} />);

    await user.click(screen.getByLabelText("removeSeat"));
    await user.click(screen.getByRole("button", { name: "updateSeats" }));

    // Confirm dialog should appear with translation keys
    expect(screen.getByText("removeSeatConfirmTitle")).toBeInTheDocument();
    expect(screen.getByText("removeSeatConfirmBody")).toBeInTheDocument();
  });

  it("disables increase button at max seats (100)", () => {
    render(<SeatManager currentSeats={100} usedSeats={50} />);
    expect(screen.getByLabelText("addSeat")).toBeDisabled();
  });
});
