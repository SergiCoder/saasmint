import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { NavLink } from "@/presentation/components/molecules";

const mockUsePathname = vi.fn<() => string>(() => "/");

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
  describe("active state", () => {
    it("marks as active when href matches the current pathname", () => {
      mockUsePathname.mockReturnValue("/dashboard");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).toHaveAttribute("aria-current", "page");
      expect(link.className).toContain("text-primary-600");
    });

    it("marks as active when href is a parent of the current pathname", () => {
      mockUsePathname.mockReturnValue("/dashboard/settings");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).toHaveAttribute("aria-current", "page");
    });

    it("is not active when the pathname is a different route", () => {
      mockUsePathname.mockReturnValue("/contact");
      render(<NavLink href="/dashboard">Dashboard</NavLink>);
      const link = screen.getByRole("link", { name: "Dashboard" });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-gray-600");
    });

    it("keeps the home link inactive on non-home routes", () => {
      mockUsePathname.mockReturnValue("/contact");
      render(<NavLink href="/">Home</NavLink>);
      const link = screen.getByRole("link", { name: "Home" });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-gray-600");
    });

    it("never marks hash links as active", () => {
      mockUsePathname.mockReturnValue("/");
      render(<NavLink href="#features">Features</NavLink>);
      const link = screen.getByRole("link", { name: "Features" });
      expect(link).not.toHaveAttribute("aria-current");
      expect(link.className).toContain("text-gray-600");
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
