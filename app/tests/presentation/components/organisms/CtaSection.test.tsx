import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CtaSection } from "@/presentation/components/organisms";

const defaultProps = {
  label: "Get Started",
  title: "Ready to launch?",
  subtitle: "Start your free trial today.",
  inputPlaceholder: "you@example.com",
  buttonText: "Sign Up",
};

describe("CtaSection", () => {
  it("renders label, title, and subtitle", () => {
    render(<CtaSection {...defaultProps} />);
    expect(screen.getByText("Get Started")).toBeInTheDocument();
    expect(screen.getByText("Ready to launch?")).toBeInTheDocument();
    expect(screen.getByText("Start your free trial today.")).toBeInTheDocument();
  });

  it("renders an email input with the given placeholder", () => {
    render(<CtaSection {...defaultProps} />);
    const input = screen.getByPlaceholderText("you@example.com");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
  });

  it("renders a button with the given text", () => {
    render(<CtaSection {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: "Sign Up" }),
    ).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(<CtaSection {...defaultProps} />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <CtaSection {...defaultProps} className="bg-gray-50" />,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("bg-gray-50");
  });
});
