import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// The component imports next/font/google (not runnable in jsdom) and the
// raw next/link (bypassing the i18n wrapper). Stub both.
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter-var" }),
}));

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

// globals.css side-effect import — Vitest can't resolve Tailwind v4 CSS.
vi.mock("./globals.css", () => ({}));

import RootNotFound from "@/app/not-found";

describe("RootNotFound", () => {
  it("renders the hardcoded English heading", () => {
    // jsdom doesn't allow <html>/<body> in a render container by default,
    // so use document.documentElement and extract what we need.
    render(<RootNotFound />);

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
  });

  it("renders a Back-to-home link pointing at /", () => {
    render(<RootNotFound />);

    const link = screen.getByRole("link", { name: "Back to home" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders the descriptive body copy", () => {
    render(<RootNotFound />);

    expect(
      screen.getByText("We couldn't find the page you were looking for."),
    ).toBeInTheDocument();
  });
});
