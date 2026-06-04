import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, type ActionResult } from "@/lib/actions/ActionResult";

// Stub ResendVerificationLink so AuthForm tests don't exercise the sub-component
// in detail — that component has its own test file.
vi.mock("@/app/[locale]/(auth)/_components/ResendVerificationLink", () => ({
  ResendVerificationLink: ({ email }: { email?: string }) => (
    <div data-testid="resend-link" data-email={email ?? ""} />
  ),
}));

// Stub useActionState so tests can drive the form's rendered state through
// the success/error branches without invoking any server action.
const mockState = vi.hoisted(
  () => ({ value: null }) as { value: ActionResult | null },
);

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: <S, P>(_action: unknown, _initial: S) =>
      [mockState.value as S, (_payload: P) => {}, false] as const,
  };
});

import { AuthForm } from "@/app/[locale]/(auth)/_components/AuthForm";

const noopAction = vi.fn(async (): Promise<ActionResult> => ok());

beforeEach(() => {
  mockState.value = null;
});

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

  it("renders an error banner (and hides serverAlerts) when the action returns a failure", () => {
    mockState.value = {
      ok: false,
      code: "invalid_credentials",
    };

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

    // i18n stub echoes the code key — actionErrors namespace is empty in the
    // global mock, so unknown codes always fall back to "unknown_error".
    expect(screen.getByRole("alert")).toHaveTextContent("unknown_error");
    expect(screen.queryByTestId("server-alert")).not.toBeInTheDocument();
  });

  it("renders ResendVerificationLink inside the error banner when code is email_not_verified", async () => {
    mockState.value = {
      ok: false,
      code: "email_not_verified",
    };

    const user = userEvent.setup();
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

    // The ResendVerificationLink stub must appear inside the alert.
    const resendLink = screen.getByTestId("resend-link");
    expect(resendLink).toBeInTheDocument();

    // Email state is forwarded to ResendVerificationLink as the email prop.
    // Type into the email field and verify it propagates.
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    )!;
    await user.type(emailInput, "user@example.com");

    await waitFor(() => {
      expect(screen.getByTestId("resend-link")).toHaveAttribute(
        "data-email",
        "user@example.com",
      );
    });
  });

  it("does not render ResendVerificationLink for other error codes", () => {
    mockState.value = {
      ok: false,
      code: "invalid_credentials",
    };

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

    expect(screen.queryByTestId("resend-link")).not.toBeInTheDocument();
  });
});
