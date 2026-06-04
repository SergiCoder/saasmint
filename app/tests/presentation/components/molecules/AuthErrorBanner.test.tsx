import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { AuthErrorBanner } from "@/presentation/components/molecules/AuthErrorBanner";

// @/lib/i18n/navigation is globally mocked in tests/setup.ts — Link renders
// as a plain <a> and useRouter returns stubs.

describe("AuthErrorBanner", () => {
  it("renders the error message inside an alert banner", () => {
    render(
      <AuthErrorBanner
        message="This link has already been used."
        backToLoginLabel="Back to sign in"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This link has already been used.",
    );
  });

  it("renders the back-to-login link with href='/login'", () => {
    render(
      <AuthErrorBanner
        message="Link expired."
        backToLoginLabel="Return to sign-in"
      />,
    );

    const link = screen.getByRole("link", { name: "Return to sign-in" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/login");
  });

  it("renders different messages without sharing state", () => {
    const { rerender } = render(
      <AuthErrorBanner message="First error" backToLoginLabel="Go back" />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("First error");

    rerender(
      <AuthErrorBanner message="Second error" backToLoginLabel="Go back" />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Second error");
    expect(screen.queryByText("First error")).not.toBeInTheDocument();
  });
});
