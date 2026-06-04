import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RouteErrorBoundary } from "@/presentation/components/organisms/RouteErrorBoundary";

describe("RouteErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders the translated error headings and the home link at the given href", () => {
    const error = new Error("boom");
    render(
      <RouteErrorBoundary
        error={error}
        reset={vi.fn()}
        homeHref="/"
        tag="marketing"
      />,
    );

    // The global setup stubs useTranslations to return the key, so titles
    // and labels render as their translation keys.
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("description")).toBeInTheDocument();
    const homeLink = screen.getByRole("link", { name: "home" });
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("renders the retry button and calls reset on click", async () => {
    const user = userEvent.setup();
    const reset = vi.fn();
    render(
      <RouteErrorBoundary
        error={new Error("boom")}
        reset={reset}
        homeHref="/dashboard"
        tag="app"
      />,
    );

    const retry = screen.getByRole("button", { name: "retry" });
    await user.click(retry);
    expect(reset).toHaveBeenCalledOnce();
  });

  it("logs the error to console.error with the provided tag on mount", () => {
    const error = Object.assign(new Error("kaboom"), { digest: "abc-123" });

    render(
      <RouteErrorBoundary
        error={error}
        reset={vi.fn()}
        homeHref="/"
        tag="public"
      />,
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[public] route error:",
      error,
    );
  });

  it("forwards the digest to ErrorView as the error id", () => {
    render(
      <RouteErrorBoundary
        error={Object.assign(new Error("x"), { digest: "digest-xyz" })}
        reset={vi.fn()}
        homeHref="/"
        tag="auth"
      />,
    );

    expect(screen.getByText(/digest-xyz/)).toBeInTheDocument();
  });

  it("omits the error id paragraph when no digest is provided", () => {
    render(
      <RouteErrorBoundary
        error={new Error("no digest")}
        reset={vi.fn()}
        homeHref="/"
        tag="app"
      />,
    );

    // errorIdLabel key is "errorId"; ensure no "errorId: ..." line exists.
    expect(screen.queryByText(/errorId:/)).not.toBeInTheDocument();
  });

  it("respects the homeHref prop for the home link", () => {
    render(
      <RouteErrorBoundary
        error={new Error("x")}
        reset={vi.fn()}
        homeHref="/custom-home"
        tag="auth"
      />,
    );

    expect(screen.getByRole("link", { name: "home" })).toHaveAttribute(
      "href",
      "/custom-home",
    );
  });
});
