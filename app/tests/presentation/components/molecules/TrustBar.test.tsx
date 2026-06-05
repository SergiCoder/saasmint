import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrustBar } from "@/presentation/components/molecules";

describe("TrustBar", () => {
  const users = [
    { name: "Alice Johnson" },
    { name: "Bob Smith", src: "/avatars/bob.png" },
  ];

  it("renders text content", () => {
    render(<TrustBar users={users} text="Loved by 1,000+ teams" />);
    expect(screen.getByText("Loved by 1,000+ teams")).toBeInTheDocument();
  });

  it("renders an avatar for each user", () => {
    render(<TrustBar users={users} text="text" />);
    // Alice has no src -> fallback initials "AJ"
    expect(screen.getByText("AJ")).toBeInTheDocument();
    // Bob has src -> rendered as an image with alt text
    expect(screen.getByAltText("Bob Smith")).toBeInTheDocument();
  });

  it("renders with empty users array", () => {
    render(<TrustBar users={[]} text="No users yet" />);
    expect(screen.getByText("No users yet")).toBeInTheDocument();
  });

  it("accepts React nodes as text prop", () => {
    render(
      <TrustBar
        users={[]}
        text={<span data-testid="rich-text">Bold claim</span>}
      />,
    );
    expect(screen.getByTestId("rich-text")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <TrustBar users={[]} text="t" className="mt-4" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("mt-4");
  });
});
