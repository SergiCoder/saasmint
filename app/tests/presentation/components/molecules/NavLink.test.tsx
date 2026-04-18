import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavLink } from "@/presentation/components/molecules";

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

describe("NavLink", () => {
  describe("active state", () => {
    it("marks as active when isActive=true", () => {
      render(
        <NavLink href="/dashboard" isActive>
          Dashboard
        </NavLink>,
      );
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link.className).toContain("text-primary-600");
    });

    it("is not active by default", () => {
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-gray-600");
    });

    it("ignores isActive=true on hash links", () => {
      render(
        <NavLink href="#features" isActive>
          Features
        </NavLink>,
      );
      // hash links render as anchors with no aria-current
      const link = screen.getByRole("link", { name: "Features" });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-gray-600");
    });
  });

  it("renders the correct href", () => {
    render(<NavLink href="/pricing">Pricing</NavLink>);
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("renders children text", () => {
    render(<NavLink href="/about">About</NavLink>);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <NavLink href="/test" className="block py-2">
        Test
      </NavLink>,
    );
    const link = screen.getByRole("link", { name: "Test" });
    expect(link.className).toContain("block");
    expect(link.className).toContain("py-2");
  });
});
