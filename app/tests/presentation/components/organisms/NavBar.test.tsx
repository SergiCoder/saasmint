import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { NavBar } from "@/presentation/components/organisms";

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

vi.mock("@/lib/pathname", () => ({
  PATHNAME_HEADER: "x-pathname",
  getPathname: async () => "/",
  getPathnameWithoutLocale: async () => "/",
}));

const defaultProps = {
  appName: "TestApp",
  links: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/subscription", label: "Subscription" },
  ],
  toggleNavLabel: "Toggle navigation",
};

async function renderNavBar(props: Parameters<typeof NavBar>[0]) {
  const element = await NavBar(props);
  return render(element);
}

describe("NavBar", () => {
  it("renders the app name via Logo", async () => {
    await renderNavBar(defaultProps);
    expect(screen.getByText("TestApp")).toBeInTheDocument();
  });

  it("renders navigation links", async () => {
    await renderNavBar(defaultProps);
    const dashboardLinks = screen.getAllByText("Dashboard");
    const subscriptionLinks = screen.getAllByText("Subscription");
    expect(dashboardLinks.length).toBeGreaterThanOrEqual(1);
    expect(subscriptionLinks.length).toBeGreaterThanOrEqual(1);
  });

  describe("user avatar", () => {
    it("renders avatar when user is provided", async () => {
      await renderNavBar({
        ...defaultProps,
        user: { fullName: "Jane Doe", avatarUrl: null },
      });
      expect(screen.getByLabelText("Jane Doe")).toBeInTheDocument();
    });

    it("does not render avatar when user is not provided", async () => {
      await renderNavBar(defaultProps);
      expect(screen.queryByLabelText("Jane Doe")).not.toBeInTheDocument();
    });

    it("does not render avatar when user is null", async () => {
      await renderNavBar({ ...defaultProps, user: null });
      expect(screen.queryByLabelText("Jane Doe")).not.toBeInTheDocument();
    });
  });

  describe("mobile menu toggle", () => {
    it("renders toggle button with aria-label", async () => {
      await renderNavBar(defaultProps);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("opens mobile menu on toggle click", async () => {
      const user = userEvent.setup();
      await renderNavBar(defaultProps);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });

      await user.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("closes mobile menu on second toggle click", async () => {
      const user = userEvent.setup();
      await renderNavBar(defaultProps);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");

      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("renders actions slot", async () => {
    await renderNavBar({
      ...defaultProps,
      actions: <button>Sign Out</button>,
    });
    expect(
      screen.getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });

  describe("user menu dropdown", () => {
    const userMenuProps = {
      ...defaultProps,
      user: { fullName: "Jane Doe", avatarUrl: null },
      userMenuItems: [
        { href: "/profile", label: "Profile" },
        { href: "/subscription", label: "Subscription" },
      ],
      userMenuSignOut: <button>Sign Out</button>,
    };

    it("renders UserMenu instead of plain Avatar when userMenuItems provided", async () => {
      await renderNavBar(userMenuProps);
      const buttons = screen.getAllByRole("button");
      const menuTrigger = buttons.find(
        (btn) => btn.getAttribute("aria-haspopup") === "menu",
      );
      expect(menuTrigger).toBeDefined();
      expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
    });

    it("renders user menu items in mobile panel", async () => {
      const user = userEvent.setup();
      await renderNavBar(userMenuProps);
      const toggle = screen.getByRole("button", {
        name: "Toggle navigation",
      });

      await user.click(toggle);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getAllByText("Profile").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Subscription").length).toBeGreaterThanOrEqual(
        1,
      );
    });
  });

  it("applies custom className", async () => {
    const { container } = await renderNavBar({
      ...defaultProps,
      className: "sticky top-0",
    });
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("sticky");
    expect(nav?.className).toContain("top-0");
  });

  describe("active state", () => {
    it("marks the link matching current pathname as active", async () => {
      vi.resetModules();
      vi.doMock("@/lib/pathname", () => ({
        PATHNAME_HEADER: "x-pathname",
        getPathname: async () => "/en/dashboard",
        getPathnameWithoutLocale: async () => "/dashboard",
      }));
      const { NavBar: NavBarReloaded } = await import(
        "@/presentation/components/organisms/NavBar"
      );
      const element = await NavBarReloaded(defaultProps);
      render(element);

      const dashboardLinks = screen.getAllByRole("link", {
        name: "Dashboard",
      });
      expect(dashboardLinks[0]).toHaveAttribute("aria-current", "page");

      const subscriptionLinks = screen.getAllByRole("link", {
        name: "Subscription",
      });
      expect(subscriptionLinks[0]).not.toHaveAttribute("aria-current");
    });
  });
});
