import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FormField } from "@/presentation/components/molecules";

describe("FormField", () => {
  it("renders a label and input", () => {
    render(<FormField label="Email" name="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("associates label with input via htmlFor/id", () => {
    render(<FormField label="Email" name="email" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("name", "email");
  });

  describe("required indicator", () => {
    it("shows asterisk when required", () => {
      render(<FormField label="Email" name="email" required />);
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("does not show asterisk when not required", () => {
      render(<FormField label="Email" name="email" />);
      expect(screen.queryByText("*")).not.toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("displays error message when provided", () => {
      render(
        <FormField
          label="Email"
          name="email"
          errorMessage="Email is required"
        />,
      );
      expect(screen.getByText("Email is required")).toBeInTheDocument();
    });

    it("sets aria-invalid on the input when there is an error", () => {
      render(
        <FormField
          label="Email"
          name="email"
          errorMessage="Email is required"
        />,
      );
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("links input to error message via aria-describedby", () => {
      render(
        <FormField
          label="Email"
          name="email"
          errorMessage="Email is required"
        />,
      );
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("aria-describedby", "email-error");
      expect(screen.getByText("Email is required")).toHaveAttribute(
        "id",
        "email-error",
      );
    });

    it("does not set aria-describedby when there is no error", () => {
      render(<FormField label="Email" name="email" />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute(
        "aria-describedby",
      );
    });

    it("does not set aria-invalid when there is no error", () => {
      render(<FormField label="Email" name="email" />);
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "false",
      );
    });
  });

  it("passes through input props like placeholder", () => {
    render(
      <FormField label="Email" name="email" placeholder="you@example.com" />,
    );
    expect(screen.getByRole("textbox")).toHaveAttribute(
      "placeholder",
      "you@example.com",
    );
  });
});
