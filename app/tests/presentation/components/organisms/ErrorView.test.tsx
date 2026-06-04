import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ErrorView } from "@/presentation/components/organisms/ErrorView";

const baseProps = {
  title: "Something went wrong",
  description: "An unexpected error occurred",
  homeLabel: "Back home",
  homeHref: "/",
};

describe("ErrorView", () => {
  it("renders title, description and home link", () => {
    render(<ErrorView {...baseProps} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText("An unexpected error occurred"),
    ).toBeInTheDocument();
    const home = screen.getByRole("link", { name: "Back home" });
    expect(home).toBeInTheDocument();
    expect(home).toHaveAttribute("href", "/");
  });

  it("does not render a retry button when retrySlot is omitted", () => {
    render(<ErrorView {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("renders the retrySlot when provided and fires its click handler", () => {
    const onRetry = vi.fn();
    render(
      <ErrorView
        {...baseProps}
        retrySlot={
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        }
      />,
    );

    const button = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders the error id only when both errorId and errorIdLabel are provided", () => {
    render(
      <ErrorView {...baseProps} errorIdLabel="Error ID" errorId="abc-123" />,
    );
    expect(screen.getByText("Error ID: abc-123")).toBeInTheDocument();
  });

  it("does not render the error id paragraph when errorId is missing", () => {
    render(<ErrorView {...baseProps} errorIdLabel="Error ID" />);
    expect(screen.queryByText(/Error ID:/)).not.toBeInTheDocument();
  });

  it("does not render the error id paragraph when errorIdLabel is missing", () => {
    render(<ErrorView {...baseProps} errorId="abc-123" />);
    expect(screen.queryByText(/abc-123/)).not.toBeInTheDocument();
  });

  it("respects a custom homeHref", () => {
    render(<ErrorView {...baseProps} homeHref="/dashboard" />);
    expect(screen.getByRole("link", { name: "Back home" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
});
