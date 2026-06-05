import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
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

import { OrgCard } from "@/presentation/components/molecules/OrgCard";

describe("OrgCard", () => {
  it("renders org name", () => {
    render(<OrgCard slug="acme" name="Acme Corp" />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("links to the org page using the slug", () => {
    render(<OrgCard slug="acme" name="Acme Corp" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/org/acme");
  });

  it("renders spots label when provided", () => {
    render(<OrgCard slug="acme" name="Acme Corp" spotsLabel="3/5 seats" />);
    expect(screen.getByText("3/5 seats")).toBeInTheDocument();
  });

  it("does not render spots label when omitted", () => {
    render(<OrgCard slug="acme" name="Acme Corp" />);
    expect(screen.queryByText(/seats/)).not.toBeInTheDocument();
  });
});
