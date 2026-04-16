import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/invitation", () => ({
  acceptInvitation: vi.fn(),
}));

import { AcceptInvitationForm } from "@/app/[locale]/(public)/invitations/[token]/_components/AcceptInvitationForm";

describe("AcceptInvitationForm", () => {
  it("renders the hidden token input", () => {
    const { container } = render(<AcceptInvitationForm token="tok-abc" />);
    const hidden = container.querySelector(
      'input[type="hidden"][name="token"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("tok-abc");
  });

  it("renders the full name field", () => {
    render(<AcceptInvitationForm token="tok-abc" />);
    expect(
      screen.getByRole("textbox", { name: /fullName/ }),
    ).toBeInTheDocument();
  });

  it("renders the password field", () => {
    const { container } = render(<AcceptInvitationForm token="tok-abc" />);
    expect(container.querySelector('input[name="password"]')).not.toBeNull();
  });

  it("renders the submit button", () => {
    render(<AcceptInvitationForm token="tok-abc" />);
    expect(screen.getByRole("button", { name: "accept" })).toBeInTheDocument();
  });
});
