import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavLink } from "@/presentation/components/molecules";

// Mock next-intl navigation (used by NavLink)
const mockUsePathname = vi.fn();
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
  usePathname: () => mockUsePathname(),
}));

describe("NavLink", () => {
  describe("active state detection", () => {
    it("marks as active when pathname matches href exactly", () => {
      mockUsePathname.mockReturnValue("/dashboard");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link.className).toContain("text-primary-600");
    });

    it("marks as active when pathname starts with href/", () => {
      mockUsePathname.mockReturnValue("/dashboard/settings");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link.className).toContain("text-primary-600");
    });

    it("is not active when pathname does not match", () => {
      mockUsePathname.mockReturnValue("/billing");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-gray-600");
    });

    it("does not false-match partial path prefixes", () => {
      // /dashboardx should NOT match /dashboard
      mockUsePathname.mockReturnValue("/dashboardx");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).not.toHaveAttribute("aria-current");
    });
  });

  it("renders the correct href", () => {
    mockUsePathname.mockReturnValue("/");
    render(<NavLink href="/pricing">Pricing</NavLink>);
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("renders children text", () => {
    mockUsePathname.mockReturnValue("/");
    render(<NavLink href="/about">About</NavLink>);
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    mockUsePathname.mockReturnValue("/");
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
