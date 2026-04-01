import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MarketingLayout } from "@/presentation/components/templates";

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
  navLinks: [
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
  ],
  footerSections: [
    {
      title: "Product",
      links: [{ href: "/features", label: "Features" }],
    },
  ],
  copyright: "\u00a9 2026 TestApp",
  toggleNavLabel: "Toggle navigation",
};

describe("MarketingLayout", () => {
  it("renders the app name in nav and footer", () => {
    render(
      <MarketingLayout {...defaultProps}>
        <p>Hero</p>
      </MarketingLayout>,
    );
    const logos = screen.getAllByText("TestApp");
    // Logo appears in both NavBar and Footer
    expect(logos).toHaveLength(2);
  });

  it("renders children as main content", () => {
    render(
      <MarketingLayout {...defaultProps}>
        <p>Hero section</p>
      </MarketingLayout>,
    );
    expect(screen.getByText("Hero section")).toBeInTheDocument();
  });

  it("renders nav links", () => {
    render(
      <MarketingLayout {...defaultProps}>
        <p>Content</p>
      </MarketingLayout>,
    );
    // Features appears in both nav and footer
    const featureLinks = screen.getAllByText("Features");
    expect(featureLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("renders copyright in footer", () => {
    render(
      <MarketingLayout {...defaultProps}>
        <p>Content</p>
      </MarketingLayout>,
    );
    expect(screen.getByText("\u00a9 2026 TestApp")).toBeInTheDocument();
  });

  it("renders nav actions when provided", () => {
    render(
      <MarketingLayout {...defaultProps} navActions={<button>Sign Up</button>}>
        <p>Content</p>
      </MarketingLayout>,
    );
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });
});
