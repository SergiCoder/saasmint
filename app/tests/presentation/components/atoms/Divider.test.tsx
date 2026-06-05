import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Divider } from "@/presentation/components/atoms";

describe("Divider", () => {
  it("renders the text", () => {
    render(<Divider text="or" />);
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Divider text="or" className="my-6" />);
    expect(container.firstChild).toHaveClass("relative", "my-6");
  });

  it("renders with default empty className", () => {
    const { container } = render(<Divider text="separator" />);
    expect(container.firstChild).toHaveClass("relative");
  });
});
