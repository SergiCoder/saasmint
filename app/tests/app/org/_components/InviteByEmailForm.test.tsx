import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/org", () => ({
  inviteMember: vi.fn(),
}));

import { InviteByEmailForm } from "@/app/[locale]/(app)/org/[slug]/_components/InviteByEmailForm";

describe("InviteByEmailForm", () => {
  it("renders the hidden orgId input", () => {
    const { container } = render(<InviteByEmailForm orgId="org-1" />);
    const hidden = container.querySelector(
      'input[type="hidden"][name="orgId"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("org-1");
  });

  it("renders the email field", () => {
    const { container } = render(<InviteByEmailForm orgId="org-1" />);
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
  });

  it("renders the role select with member and admin options", () => {
    render(<InviteByEmailForm orgId="org-1" />);
    const select = screen.getByLabelText("role") as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("member");

    const options = select.querySelectorAll("option");
    expect(options).toHaveLength(2);
    expect(options[0].value).toBe("member");
    expect(options[1].value).toBe("admin");
  });

  it("renders the submit button", () => {
    render(<InviteByEmailForm orgId="org-1" />);
    expect(
      screen.getByRole("button", { name: "inviteMember" }),
    ).toBeInTheDocument();
  });
});
