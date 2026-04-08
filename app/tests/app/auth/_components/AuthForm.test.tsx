import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AuthForm } from "@/app/[locale]/(auth)/_components/AuthForm";

const noopAction = vi.fn(async () => undefined);

describe("AuthForm", () => {
  it("renders email + password fields and a submit button", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        footerLink={{ href: "/signup", textKey: "noAccount", linkKey: "signUp" }}
      />,
    );

    expect(screen.getByLabelText(/email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/fullName/)).not.toBeInTheDocument();
  });

  it("renders the full name field when showNameField is true", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="signup"
        passwordAutoComplete="new-password"
        showNameField
        footerLink={{ href: "/login", textKey: "haveAccount", linkKey: "signIn" }}
      />,
    );

    expect(screen.getByLabelText(/fullName/)).toBeInTheDocument();
  });

  it("renders a forgot password link when forgotPasswordHref is provided", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        forgotPasswordHref="/forgot-password"
        footerLink={{ href: "/signup", textKey: "noAccount", linkKey: "signUp" }}
      />,
    );

    const link = screen.getByRole("link", { name: "forgotPassword" });
    expect(link).toHaveAttribute("href", "/forgot-password");
  });

  it("does not render a forgot password link when href is not provided", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        footerLink={{ href: "/signup", textKey: "noAccount", linkKey: "signUp" }}
      />,
    );

    expect(
      screen.queryByRole("link", { name: "forgotPassword" }),
    ).not.toBeInTheDocument();
  });

  it("renders the footer link with the provided href", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        footerLink={{ href: "/signup", textKey: "noAccount", linkKey: "signUp" }}
      />,
    );

    const footerLink = screen.getByRole("link", { name: "signUp" });
    expect(footerLink).toHaveAttribute("href", "/signup");
  });

  it("renders hidden inputs for every entry in hiddenFields", () => {
    const { container } = render(
      <AuthForm
        action={noopAction}
        translationNamespace="signup"
        passwordAutoComplete="new-password"
        hiddenFields={{ plan: "team", interval: "month" }}
        footerLink={{ href: "/login", textKey: "haveAccount", linkKey: "signIn" }}
      />,
    );

    const plan = container.querySelector('input[name="plan"]');
    const interval = container.querySelector('input[name="interval"]');
    expect(plan).toHaveAttribute("type", "hidden");
    expect(plan).toHaveAttribute("value", "team");
    expect(interval).toHaveAttribute("type", "hidden");
    expect(interval).toHaveAttribute("value", "month");
  });

  it("renders serverAlerts when there is no client-side error", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        serverAlerts={<div data-testid="server-alert">server hint</div>}
        footerLink={{ href: "/signup", textKey: "noAccount", linkKey: "signUp" }}
      />,
    );

    expect(screen.getByTestId("server-alert")).toBeInTheDocument();
  });
});
