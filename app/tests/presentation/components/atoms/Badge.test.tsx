import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "@/presentation/components/atoms";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("defaults to info variant styling", () => {
    render(<Badge>Info</Badge>);
    const el = screen.getByText("Info");
    expect(el.className).toContain("bg-blue-50");
    expect(el.className).toContain("text-blue-700");
  });

  it("applies success variant styling", () => {
    render(<Badge variant="success">Paid</Badge>);
    const el = screen.getByText("Paid");
    expect(el.className).toContain("bg-green-50");
    expect(el.className).toContain("text-green-700");
  });

  it("applies warning variant styling", () => {
    render(<Badge variant="warning">Pending</Badge>);
    const el = screen.getByText("Pending");
    expect(el.className).toContain("bg-yellow-50");
    expect(el.className).toContain("text-yellow-800");
  });

  it("applies error variant styling", () => {
    render(<Badge variant="error">Failed</Badge>);
    const el = screen.getByText("Failed");
    expect(el.className).toContain("bg-red-50");
    expect(el.className).toContain("text-red-700");
  });

  it("applies custom className", () => {
    render(<Badge className="extra-class">Tag</Badge>);
    expect(screen.getByText("Tag").className).toContain("extra-class");
  });
});
