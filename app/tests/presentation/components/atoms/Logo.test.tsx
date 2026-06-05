import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Logo } from "@/presentation/components/atoms";

vi.mock("@/lib/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Logo", () => {
  it("renders the app name", () => {
    render(<Logo appName="Acme" />);
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("applies primary-600 brand color", () => {
    render(<Logo appName="Acme" />);
    expect(screen.getByText("Acme").className).toContain("text-primary-600");
  });

  it("applies custom className", () => {
    render(<Logo appName="Acme" className="text-2xl" />);
    expect(screen.getByText("Acme").className).toContain("text-2xl");
  });

  it("renders as a link to homepage", () => {
    const { container } = render(<Logo appName="Acme" />);
    const link = container.querySelector("a");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});
