import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Label } from "@/presentation/components/atoms";

describe("Label", () => {
  it("renders children text", () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("sets htmlFor attribute", () => {
    render(<Label htmlFor="email">Email</Label>);
    const label = screen.getByText("Email");
    expect(label).toHaveAttribute("for", "email");
  });

  it("does not show asterisk when not required", () => {
    render(<Label htmlFor="email">Email</Label>);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("shows red asterisk when required", () => {
    render(
      <Label htmlFor="email" required>
        Email
      </Label>,
    );
    const asterisk = screen.getByText("*");
    expect(asterisk).toBeInTheDocument();
    expect(asterisk.className).toContain("text-red-500");
  });

  it("applies custom className", () => {
    render(
      <Label htmlFor="email" className="mb-4">
        Email
      </Label>,
    );
    expect(screen.getByText("Email").className).toContain("mb-4");
  });
});
