import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { AlertBanner } from "@/presentation/components/molecules";

describe("AlertBanner", () => {
  it("renders children content", () => {
    render(<AlertBanner>Something happened</AlertBanner>);
    expect(screen.getByText("Something happened")).toBeInTheDocument();
  });

  it("has role=alert for accessibility", () => {
    render(<AlertBanner>Alert text</AlertBanner>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  describe("variants", () => {
    it("defaults to info variant", () => {
      render(<AlertBanner>Info</AlertBanner>);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-blue-50");
      expect(alert.className).toContain("text-blue-800");
    });

    it("applies success variant", () => {
      render(<AlertBanner variant="success">Done</AlertBanner>);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-green-50");
      expect(alert.className).toContain("text-green-800");
    });

    it("applies warning variant", () => {
      render(<AlertBanner variant="warning">Careful</AlertBanner>);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-yellow-50");
      expect(alert.className).toContain("text-yellow-800");
    });

    it("applies error variant", () => {
      render(<AlertBanner variant="error">Error</AlertBanner>);
      const alert = screen.getByRole("alert");
      expect(alert.className).toContain("bg-red-50");
      expect(alert.className).toContain("text-red-800");
    });
  });

  describe("dismissible behavior", () => {
    it("does not show dismiss button by default", () => {
      render(<AlertBanner>No dismiss</AlertBanner>);
      expect(
        screen.queryByRole("button", { name: "Dismiss" }),
      ).not.toBeInTheDocument();
    });

    it("shows dismiss button when dismissible is true", () => {
      render(<AlertBanner dismissible>Dismissible</AlertBanner>);
      expect(
        screen.getByRole("button", { name: "Dismiss" }),
      ).toBeInTheDocument();
    });

    it("hides the banner when dismiss button is clicked", async () => {
      const user = userEvent.setup();
      render(<AlertBanner dismissible>Will be dismissed</AlertBanner>);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Dismiss" }));

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("applies custom className", () => {
    render(<AlertBanner className="mt-4">Styled</AlertBanner>);
    expect(screen.getByRole("alert").className).toContain("mt-4");
  });
});
