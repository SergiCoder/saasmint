import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UserMenu } from "@/presentation/components/molecules";

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
  user: { fullName: "Jane Doe", avatarUrl: null },
  menuItems: [
    { href: "/settings", label: "Profile" },
    { href: "/settings", label: "Settings" },
    { href: "/billing", label: "Billing" },
  ],
  signOutSlot: <button>Sign out</button>,
};

describe("UserMenu", () => {
  it("renders the avatar trigger", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.getByLabelText("Jane Doe")).toBeInTheDocument();
  });

  it("dropdown is closed by default", () => {
    render(<UserMenu {...defaultProps} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("opens dropdown on avatar click", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);

    await user.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("closes dropdown on second click", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);
    const trigger = screen.getByRole("button", { expanded: false });

    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes dropdown on Escape key", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <UserMenu {...defaultProps} />
        <div data-testid="outside">outside</div>
      </div>,
    );

    await user.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("renders menu items as links with correct hrefs", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);

    await user.click(screen.getByRole("button", { expanded: false }));

    const profileLink = screen.getByText("Profile");
    expect(profileLink.closest("a")).toHaveAttribute("href", "/settings");

    const billingLink = screen.getByText("Billing");
    expect(billingLink.closest("a")).toHaveAttribute("href", "/billing");
  });

  it("renders signOutSlot content", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);

    await user.click(screen.getByRole("button", { expanded: false }));

    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  it("sets aria-expanded correctly", async () => {
    const user = userEvent.setup();
    render(<UserMenu {...defaultProps} />);
    const trigger = screen.getByRole("button", { expanded: false });

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
