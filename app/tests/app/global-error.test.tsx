import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// The component imports Link from next/link (raw, not the i18n wrapper) —
// there is no LocaleProvider at the root-error boundary. Stub to a plain <a>.
vi.mock("next/link", async () => {
  const React = await import("react");
  const Link = ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children);
  return { default: Link };
});

// Importing the component pulls in "./globals.css"; let Vitest ignore it.
vi.mock("./globals.css", () => ({}));

import GlobalError from "@/app/global-error";

describe("GlobalError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the hardcoded English title and description", () => {
    render(<GlobalError error={new Error("boom")} reset={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We hit an unexpected error. Please try again in a moment.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a Try-again button that invokes reset when clicked", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<GlobalError error={new Error("boom")} reset={reset} />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders a Back-to-home link pointing at /", () => {
    render(<GlobalError error={new Error("boom")} reset={vi.fn()} />);

    const link = screen.getByRole("link", { name: "Back to home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders the error digest when present", () => {
    const err = Object.assign(new Error("boom"), { digest: "digest-123" });
    render(<GlobalError error={err} reset={vi.fn()} />);

    expect(screen.getByText("Error ID: digest-123")).toBeInTheDocument();
  });

  it("omits the error-digest line when digest is absent", () => {
    render(<GlobalError error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.queryByText(/Error ID/)).not.toBeInTheDocument();
  });

  it("logs the error to console on mount", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const err = new Error("boom");

    render(<GlobalError error={err} reset={vi.fn()} />);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[global] root layout error:",
      err,
    );
    consoleErrorSpy.mockRestore();
  });
});
