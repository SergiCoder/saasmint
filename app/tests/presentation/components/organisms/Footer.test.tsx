import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "@/presentation/components/organisms";

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

const defaultProps = {
  appName: "TestApp",
  sections: [
    {
      title: "Product",
      links: [
        { href: "/features", label: "Features" },
        { href: "/pricing", label: "Pricing" },
      ],
    },
    {
      title: "Company",
      links: [{ href: "/about", label: "About" }],
    },
  ],
  copyright: "\u00a9 2026 TestApp Inc.",
};

describe("Footer", () => {
  it("renders the app name via Logo", () => {
    render(<Footer {...defaultProps} />);
    expect(screen.getByText("TestApp")).toBeInTheDocument();
  });

  it("renders all links from all sections flattened", () => {
    render(<Footer {...defaultProps} />);
    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getByText("Pricing")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders section links with correct hrefs", () => {
    render(<Footer {...defaultProps} />);
    const featuresLink = screen.getByText("Features").closest("a");
    expect(featuresLink).toHaveAttribute("href", "/features");
    const pricingLink = screen.getByText("Pricing").closest("a");
    expect(pricingLink).toHaveAttribute("href", "/pricing");
  });

  it("renders copyright text", () => {
    render(<Footer {...defaultProps} />);
    expect(screen.getByText("\u00a9 2026 TestApp Inc.")).toBeInTheDocument();
  });

  it("renders with empty sections array", () => {
    render(
      <Footer
        appName="TestApp"
        sections={[]}
        copyright="\u00a9 2026 TestApp"
      />,
    );
    expect(screen.getByText("TestApp")).toBeInTheDocument();
    expect(screen.getByText(/2026 TestApp/)).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <Footer {...defaultProps} className="mt-auto" />,
    );
    const footer = container.querySelector("footer");
    expect(footer?.className).toContain("mt-auto");
  });

  it("does not render a version link when the version prop is omitted", () => {
    render(<Footer {...defaultProps} />);
    expect(screen.queryByRole("link", { name: /^v\d/ })).toBeNull();
  });

  it("renders the version label as an external link when version is provided", () => {
    render(
      <Footer
        {...defaultProps}
        version={{
          label: "v0.8.0",
          href: "https://github.com/SergiCoder/saasmint-app/releases/tag/v0.8.0",
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "v0.8.0" });
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/SergiCoder/saasmint-app/releases/tag/v0.8.0",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });
});
