import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PasswordRequirements } from "@/presentation/components/molecules";

describe("PasswordRequirements", () => {
  it("renders the title and all four rule items", () => {
    render(<PasswordRequirements />);

    // The default next-intl mock returns the key verbatim, so we assert
    // against the keys declared in the component.
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("minLength")).toBeInTheDocument();
    expect(screen.getByText("notCommon")).toBeInTheDocument();
    expect(screen.getByText("notSimilar")).toBeInTheDocument();
    expect(screen.getByText("notNumeric")).toBeInTheDocument();
  });

  it("renders rules inside a list with four items", () => {
    render(<PasswordRequirements />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
  });

  it("merges the provided className onto the root container", () => {
    const { container } = render(
      <PasswordRequirements className="custom-class" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("custom-class");
  });
});
