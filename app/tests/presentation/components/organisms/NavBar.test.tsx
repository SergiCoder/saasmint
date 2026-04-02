import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { NavBar } from "@/presentation/components/organisms";

// Mock next-intl navigation (used by NavLink)
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
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const defaultProps = {
  appName: "TestApp",
  links: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/billing", label: "Billing" },
  ],
  toggleNavLabel: "Toggle navigation",
};

describe("NavBar", () => {
  it("renders the app name via Logo", () => {
    render(<NavBar {...defaultProps} />);
    expect(screen.getByText("TestApp")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(<NavBar {...defaultProps} />);
    const dashboardLinks = screen.getAllByText("Dashboard");
    const billingLinks = screen.getAllByText("Billing");
    // Links appear in both desktop and (potentially) mobile nav
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(billingLinks.length).toBeGreaterThanOrEqual(1);
  });

  describe("user avatar", () => {
    it("renders avatar when user is provided", () => {
      render(
        <NavBar
          {...defaultProps}
          user={{ fullName: "Jane Doe", avatarUrl: null }}
        />,
      );
      expect(screen.getByLabelText("Jane Doe")).toBeInTheDocument();
    });

    it("does not render avatar when user is not provided", () => {
      render(<NavBar {...defaultProps} />);
      expect(screen.queryByLabelText("Jane Doe")).not.toBeInTheDocument();
    });

    it("does not render avatar when user is null", () => {
      render(<NavBar {...defaultProps} user={null} />);
      expect(screen.queryByLabelText("Jane Doe")).not.toBeInTheDocument();
    });
  });

  describe("mobile menu toggle", () => {
    it("renders toggle button with aria-label", () => {
      render(<NavBar {...defaultProps} />);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("opens mobile menu on toggle click", async () => {
      const user = userEvent.setup();
      render(<NavBar {...defaultProps} />);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });

      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("closes mobile menu on second toggle click", async () => {
      const user = userEvent.setup();
      render(<NavBar {...defaultProps} />);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("renders actions slot", () => {
    render(<NavBar {...defaultProps} actions={<button>Sign Out</button>} />);
    expect(
      screen.getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });

  describe("user menu dropdown", () => {
    const userMenuProps = {
      ...defaultProps,
      user: { fullName: "Jane Doe", avatarUrl: null },
      userMenuItems: [
        { href: "/settings", label: "Profile" },
        { href: "/billing", label: "Billing" },
      ],
      userMenuSignOut: <button>Sign Out</button>,
    };

    it("renders UserMenu instead of plain Avatar when userMenuItems provided", () => {
      render(<NavBar {...userMenuProps} />);
      const buttons = screen.getAllByRole("button");
      const menuTrigger = buttons.find(
        (btn) => btn.getAttribute("aria-haspopup") === "menu",
      );
      expect(menuTrigger).toBeDefined();
      expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
    });

    it("renders user menu items in mobile panel", async () => {
      const user = userEvent.setup();
      render(<NavBar {...userMenuProps} />);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });

      await user.click(toggle);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getAllByText("Profile").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Billing").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("applies custom className", () => {
    const { container } = render(
      <NavBar {...defaultProps} className="sticky top-0" />,
    );
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("sticky");
    expect(nav?.className).toContain("top-0");
  });
});
