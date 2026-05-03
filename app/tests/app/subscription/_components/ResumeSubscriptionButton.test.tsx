import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockResumeSubscription = vi.fn();
vi.mock("@/app/actions/billing", () => ({
  resumeSubscription: (...args: unknown[]) => mockResumeSubscription(...args),
}));

const mockRouterRefresh = vi.fn();
vi.mock("@/lib/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

import { ResumeSubscriptionButton } from "@/app/[locale]/(app)/subscription/_components/ResumeSubscriptionButton";

beforeEach(() => {
  mockResumeSubscription.mockReset();
  mockRouterRefresh.mockReset();
});

describe("ResumeSubscriptionButton", () => {
  it("renders a button labelled with the children", () => {
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("uses the primary variant", () => {
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);
    const button = screen.getByRole("button", { name: "Resume" });
    expect(button).toHaveAttribute("data-variant", "primary");
  });

  it("calls resumeSubscription without context when the prop is omitted", async () => {
    mockResumeSubscription.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(mockResumeSubscription).toHaveBeenCalledWith(undefined);
    });
  });

  it("forwards context=personal to resumeSubscription when the prop is set", async () => {
    mockResumeSubscription.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(
      <ResumeSubscriptionButton context="personal">
        Resume
      </ResumeSubscriptionButton>,
    );

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(mockResumeSubscription).toHaveBeenCalledWith("personal");
    });
  });

  it("forwards context=team to resumeSubscription when the prop is set", async () => {
    mockResumeSubscription.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(
      <ResumeSubscriptionButton context="team">
        Resume
      </ResumeSubscriptionButton>,
    );

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(mockResumeSubscription).toHaveBeenCalledWith("team");
    });
  });

  it("calls router.refresh after a successful resume", async () => {
    mockResumeSubscription.mockResolvedValueOnce({ ok: true, data: null });
    const user = userEvent.setup();
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledOnce();
    });
  });

  it("does not call router.refresh when the action fails", async () => {
    mockResumeSubscription.mockResolvedValueOnce({
      ok: false,
      code: "HTTP_500",
      message: "Server error",
    });
    const user = userEvent.setup();
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("displays the server-provided error message on failure", async () => {
    mockResumeSubscription.mockResolvedValueOnce({
      ok: false,
      code: "HTTP_500",
      message: "Unable to resume subscription",
    });
    const user = userEvent.setup();
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(
        screen.getByText("Unable to resume subscription"),
      ).toBeInTheDocument();
    });
  });

  it("falls back to the unknown_error translation when only a code is returned", async () => {
    mockResumeSubscription.mockResolvedValueOnce({
      ok: false,
      code: "HTTP_500",
    });
    const user = userEvent.setup();
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);

    await user.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => {
      expect(screen.getByText("unknown_error")).toBeInTheDocument();
    });
  });
});
