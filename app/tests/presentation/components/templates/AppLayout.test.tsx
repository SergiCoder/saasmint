import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppLayout } from "@/presentation/components/templates";
import type { NavBarProps } from "@/presentation/components/organisms/NavBar";

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
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

// NavBar is an async server component. Mock it with a synchronous renderer
// so RTL's synchronous render() resolves in one tick.
vi.mock("@/presentation/components/organisms/NavBar", () => ({
  NavBar: ({ appName, links, user, actions }: NavBarProps) => (
    <nav>
      <span>{appName}</span>
      {links.map((l) => (
        <a key={l.label} href={l.href}>
          {l.label}
        </a>
      ))}
      {user && <span aria-label={user.fullName}>{user.fullName}</span>}
      {actions}
    </nav>
  ),
}));

const defaultProps = {
  appName: "TestApp",
  navLinks: [{ href: "/dashboard", label: "Dashboard" }],
  user: { fullName: "Jane Doe", avatarUrl: null },
  toggleNavLabel: "Toggle navigation",
};

describe("AppLayout", () => {
  it("renders the app name in the nav", () => {
    render(
      <AppLayout {...defaultProps}>
        <p>Content</p>
      </AppLayout>,
    );
    expect(screen.getByText("TestApp")).toBeInTheDocument();
  });

  it("renders children in main area", () => {
    render(
      <AppLayout {...defaultProps}>
        <p>Dashboard content</p>
      </AppLayout>,
    );
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("renders nav actions when provided", () => {
    render(
      <AppLayout {...defaultProps} navActions={<button>Sign Out</button>}>
        <p>Content</p>
      </AppLayout>,
    );
    expect(
      screen.getByRole("button", { name: "Sign Out" }),
    ).toBeInTheDocument();
  });

  it("renders the user avatar", () => {
    render(
      <AppLayout {...defaultProps}>
        <p>Content</p>
      </AppLayout>,
    );
    expect(screen.getByLabelText("Jane Doe")).toBeInTheDocument();
  });
});
