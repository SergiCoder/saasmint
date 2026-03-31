import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { LogoCloud } from "@/presentation/components/organisms";

const logos = ["Acme Corp", "Globex", "Initech", "Umbrella"];

describe("LogoCloud", () => {
  it("renders the label", () => {
    render(<LogoCloud label="Trusted by leading companies" logos={logos} />);
    expect(
      screen.getByText("Trusted by leading companies"),
    ).toBeInTheDocument();
  });

  it("renders all logo names", () => {
    render(<LogoCloud label="Partners" logos={logos} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Globex")).toBeInTheDocument();
    expect(screen.getByText("Initech")).toBeInTheDocument();
    expect(screen.getByText("Umbrella")).toBeInTheDocument();
  });

  it("renders with empty logos array", () => {
    const { container } = render(<LogoCloud label="Partners" logos={[]} />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("renders as a section element", () => {
    const { container } = render(
      <LogoCloud label="Partners" logos={logos} />,
    );
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <LogoCloud label="Partners" logos={logos} className="py-20" />,
    );
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("py-20");
  });
});
