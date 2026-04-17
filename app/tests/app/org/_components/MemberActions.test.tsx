import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpdateMemberRole = vi.fn();
const mockRemoveMember = vi.fn();
vi.mock("@/app/actions/org", () => ({
  updateMemberRole: (...args: unknown[]) => mockUpdateMemberRole(...args),
  removeMember: (...args: unknown[]) => mockRemoveMember(...args),
}));

import { MemberActions } from "@/app/[locale]/(app)/org/[slug]/_components/MemberActions";

const defaultLabels = {
  menu: "Member actions",
  promoteToAdmin: "Promote to admin",
  demoteToMember: "Demote to member",
  remove: "Remove",
  removeConfirmTitle: "Remove member?",
  removeConfirmBody: "This will remove the member.",
  removeConfirmAction: "Yes, remove",
  cancel: "Cancel",
};

beforeEach(() => {
  mockUpdateMemberRole.mockReset();
  mockRemoveMember.mockReset();
});

describe("MemberActions", () => {
  it("renders the trigger button", () => {
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="member"
        labels={defaultLabels}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Member actions" }),
    ).toBeInTheDocument();
  });

  it("shows promote option when current role is member", async () => {
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="member"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));

    expect(
      screen.getByRole("button", { name: "Promote to admin" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Demote to member" }),
    ).not.toBeInTheDocument();
  });

  it("shows demote option when current role is admin", async () => {
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="admin"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));

    expect(
      screen.getByRole("button", { name: "Demote to member" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Promote to admin" }),
    ).not.toBeInTheDocument();
  });

  it("calls updateMemberRole with admin when promoting", async () => {
    mockUpdateMemberRole.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="member"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));
    await user.click(screen.getByRole("button", { name: "Promote to admin" }));

    await waitFor(() => {
      expect(mockUpdateMemberRole).toHaveBeenCalledTimes(1);
    });

    const formData = mockUpdateMemberRole.mock.calls[0]![0] as FormData;
    expect(formData.get("orgId")).toBe("org-1");
    expect(formData.get("userId")).toBe("user-1");
    expect(formData.get("role")).toBe("admin");
  });

  it("calls updateMemberRole with member when demoting", async () => {
    mockUpdateMemberRole.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="admin"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));
    await user.click(screen.getByRole("button", { name: "Demote to member" }));

    await waitFor(() => {
      expect(mockUpdateMemberRole).toHaveBeenCalledTimes(1);
    });

    const formData = mockUpdateMemberRole.mock.calls[0]![0] as FormData;
    expect(formData.get("role")).toBe("member");
  });

  it("opens confirm dialog when remove is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="member"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.getByText("Remove member?")).toBeInTheDocument();
    expect(
      screen.getByText("This will remove the member."),
    ).toBeInTheDocument();
  });

  it("calls removeMember when removal is confirmed", async () => {
    mockRemoveMember.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="member"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Yes, remove" }));

    await waitFor(() => {
      expect(mockRemoveMember).toHaveBeenCalledTimes(1);
    });

    const formData = mockRemoveMember.mock.calls[0]![0] as FormData;
    expect(formData.get("orgId")).toBe("org-1");
    expect(formData.get("userId")).toBe("user-1");
  });

  it("always shows the remove option", async () => {
    const user = userEvent.setup();
    render(
      <MemberActions
        orgId="org-1"
        userId="user-1"
        currentRole="member"
        labels={defaultLabels}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Member actions" }));

    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
