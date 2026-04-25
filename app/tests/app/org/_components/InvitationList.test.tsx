import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/org", () => ({
  cancelInvitation: vi.fn(),
}));

import { InvitationList } from "@/app/[locale]/(app)/org/[slug]/_components/InvitationList";
import type { Invitation } from "@/domain/models/Invitation";

const columns = {
  email: "Email",
  role: "Role",
  invitedBy: "Invited by",
  expiresAt: "Expires",
  actions: "Actions",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Member",
};

function makeInvitation(overrides?: Partial<Invitation>): Invitation {
  return {
    id: "inv-1",
    org: "org-1",
    orgName: "Acme",
    email: "alice@example.com",
    role: "member",
    status: "pending",
    invitedBy: { id: "u1", email: "bob@example.com", fullName: "Bob Smith" },
    createdAt: "2026-01-01T00:00:00Z",
    expiresAt: "2026-01-08T00:00:00Z",
    ...overrides,
  };
}

describe("InvitationList", () => {
  it("renders column headers", () => {
    render(
      <InvitationList
        invitations={[]}
        orgId="org-1"
        locale="en"
        columns={columns}
        roleLabels={roleLabels}
        cancelLabel="Cancel"
      />,
    );

    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Invited by")).toBeInTheDocument();
    expect(screen.getByText("Expires")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders invitation rows", () => {
    const inv = makeInvitation();
    render(
      <InvitationList
        invitations={[inv]}
        orgId="org-1"
        locale="en"
        columns={columns}
        roleLabels={roleLabels}
        cancelLabel="Cancel"
      />,
    );

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders admin role with correct label", () => {
    const inv = makeInvitation({ id: "inv-2", role: "admin" });
    render(
      <InvitationList
        invitations={[inv]}
        orgId="org-1"
        locale="en"
        columns={columns}
        roleLabels={roleLabels}
        cancelLabel="Cancel"
      />,
    );

    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("falls back to raw role when label is missing", () => {
    const inv = makeInvitation({ id: "inv-3", role: "member" });
    render(
      <InvitationList
        invitations={[inv]}
        orgId="org-1"
        locale="en"
        columns={columns}
        roleLabels={{}}
        cancelLabel="Cancel"
      />,
    );

    expect(screen.getByText("member")).toBeInTheDocument();
  });

  it("renders multiple invitations", () => {
    const invitations = [
      makeInvitation({ id: "inv-1", email: "alice@example.com" }),
      makeInvitation({ id: "inv-2", email: "charlie@example.com" }),
    ];
    render(
      <InvitationList
        invitations={invitations}
        orgId="org-1"
        locale="en"
        columns={columns}
        roleLabels={roleLabels}
        cancelLabel="Cancel"
      />,
    );

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("charlie@example.com")).toBeInTheDocument();
  });

  it("includes hidden orgId and invitationId fields in cancel form", () => {
    const inv = makeInvitation();
    const { container } = render(
      <InvitationList
        invitations={[inv]}
        orgId="org-1"
        locale="en"
        columns={columns}
        roleLabels={roleLabels}
        cancelLabel="Cancel"
      />,
    );

    const orgInput = container.querySelector(
      'input[name="orgId"]',
    ) as HTMLInputElement;
    expect(orgInput.value).toBe("org-1");

    const invInput = container.querySelector(
      'input[name="invitationId"]',
    ) as HTMLInputElement;
    expect(invInput.value).toBe("inv-1");
  });
});
