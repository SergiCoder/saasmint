import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import { AuthForm } from "@/app/[locale]/(auth)/_components/AuthForm";

const noopAction = vi.fn(async () => undefined);

/**
 * These tests query by input `name` attributes and link `href`s rather than
 * label text or link copy — that way they stay green when i18n keys are
 * renamed or translated to non-English locales. The `name` attribute is
 * the real server-action contract (what `formData.get(...)` reads).
 */

function selectByName(
  container: HTMLElement,
  name: string,
): HTMLInputElement | null {
  return container.querySelector<HTMLInputElement>(`input[name="${name}"]`);
}

describe("AuthForm", () => {
  it("renders email + password fields and a submit button", () => {
    const { container } = render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        footerLink={{
          href: "/signup",
          textKey: "noAccount",
          linkKey: "signUp",
        }}
      />,
    );

    expect(selectByName(container, "email")).toHaveAttribute("type", "email");
    expect(selectByName(container, "password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(selectByName(container, "fullName")).toBeNull();
    expect(screen.getByRole("button", { name: /.+/ })).toHaveAttribute(
      "type",
      "submit",
    );
  });

  it("renders the full name field when showNameField is true", () => {
    const { container } = render(
      <AuthForm
        action={noopAction}
        translationNamespace="signup"
        passwordAutoComplete="new-password"
        showNameField
        footerLink={{
          href: "/login",
          textKey: "haveAccount",
          linkKey: "signIn",
        }}
      />,
    );

    const fullName = selectByName(container, "fullName");
    expect(fullName).toBeInTheDocument();
    expect(fullName).toBeRequired();
  });

  it("renders a forgot-password link when forgotPasswordHref is provided", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        forgotPasswordHref="/forgot-password"
        footerLink={{
          href: "/signup",
          textKey: "noAccount",
          linkKey: "signUp",
        }}
      />,
    );

    const links = screen.getAllByRole("link");
    const forgotLink = links.find(
      (a) => a.getAttribute("href") === "/forgot-password",
    );
    expect(forgotLink).toBeInTheDocument();
  });

  it("does not render a forgot-password link when href is not provided", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        footerLink={{
          href: "/signup",
          textKey: "noAccount",
          linkKey: "signUp",
        }}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(
      links.find((a) => a.getAttribute("href") === "/forgot-password"),
    ).toBeUndefined();
  });

  it("renders the footer link at the provided href", () => {
    render(
      <AuthForm
        action={noopAction}
        translationNamespace="login"
        passwordAutoComplete="current-password"
        footerLink={{
          href: "/signup",
          textKey: "noAccount",
          linkKey: "signUp",
        }}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(
      links.find((a) => a.getAttribute("href") === "/signup"),
    ).toBeInTheDocument();
  });

  it("renders hidden inputs for every entry in hiddenFields", () => {
    const { container } = render(
      <AuthForm
        action={noopAction}
        translationNamespace="signup"
        passwordAutoComplete="new-password"
        hiddenFields={{ plan: "team", interval: "month" }}
        footerLink={{
          href: "/login",
          textKey: "haveAccount",
          linkKey: "signIn",
        }}
      />,
    );

    const plan = selectByName(container, "plan");
    const interval = selectByName(container, "interval");
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
        footerLink={{
          href: "/signup",
          textKey: "noAccount",
          linkKey: "signUp",
        }}
      />,
    );

    expect(screen.getByTestId("server-alert")).toBeInTheDocument();
  });
});
