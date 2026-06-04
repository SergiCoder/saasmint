import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Avatar } from "@/presentation/components/atoms";

describe("Avatar", () => {
  describe("when src is provided", () => {
    it("renders an image instead of initials", () => {
      render(<Avatar src="https://example.com/photo.jpg" alt="Jane Doe" />);
      expect(screen.getByRole("img")).toHaveAttribute("alt", "Jane Doe");
      expect(screen.queryByLabelText("Jane Doe")).not.toBeInTheDocument();
    });
  });

  describe("when src is not provided", () => {
    it("renders initials from a two-word name", () => {
      render(<Avatar alt="Jane Doe" />);
      expect(screen.getByLabelText("Jane Doe")).toHaveTextContent("JD");
    });

    it("renders initials from a single-word name", () => {
      render(<Avatar alt="Jane" />);
      expect(screen.getByLabelText("Jane")).toHaveTextContent("J");
    });

    it("limits initials to two characters for long names", () => {
      render(<Avatar alt="John Michael Doe Smith" />);
      expect(screen.getByLabelText("John Michael Doe Smith")).toHaveTextContent(
        "JM",
      );
    });

    it("uppercases initials from lowercase names", () => {
      render(<Avatar alt="jane doe" />);
      expect(screen.getByLabelText("jane doe")).toHaveTextContent("JD");
    });
  });

  describe("when src is null", () => {
    it("falls back to initials", () => {
      render(<Avatar src={null} alt="Jane Doe" />);
      expect(screen.getByLabelText("Jane Doe")).toHaveTextContent("JD");
    });
  });

  describe("sizes", () => {
    it("applies sm size classes", () => {
      render(<Avatar alt="Jane Doe" size="sm" />);
      const el = screen.getByLabelText("Jane Doe");
      expect(el.className).toContain("h-8");
      expect(el.className).toContain("w-8");
    });

    it("applies md size classes by default", () => {
      render(<Avatar alt="Jane Doe" />);
      const el = screen.getByLabelText("Jane Doe");
      expect(el.className).toContain("h-10");
      expect(el.className).toContain("w-10");
    });

    it("applies lg size classes", () => {
      render(<Avatar alt="Jane Doe" size="lg" />);
      const el = screen.getByLabelText("Jane Doe");
      expect(el.className).toContain("h-12");
      expect(el.className).toContain("w-12");
    });
  });

  it("applies custom className", () => {
    render(<Avatar alt="Jane Doe" className="my-custom-class" />);
    const el = screen.getByLabelText("Jane Doe");
    expect(el.className).toContain("my-custom-class");
  });
});
