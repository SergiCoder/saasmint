import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OrgMemberList } from "@/presentation/components/organisms";

const columns = { name: "Name", role: "Role", actions: "Actions" };

const members = [
  {
    id: "1",
    fullName: "Alice Owner",
    email: "alice@example.com",
    avatarUrl: null,
    role: "owner" as const,
    roleLabel: "Owner",
  },
  {
    id: "2",
    fullName: "Bob Admin",
    email: "bob@example.com",
    avatarUrl: "https://example.com/bob.jpg",
    role: "admin" as const,
    roleLabel: "Admin",
    actions: <button>Remove</button>,
  },
  {
    id: "3",
    fullName: "Carol Member",
    email: "carol@example.com",
    role: "member" as const,
    roleLabel: "Member",
  },
];

describe("OrgMemberList", () => {
  it("renders column headers", () => {
    render(<OrgMemberList members={members} columns={columns} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders all members", () => {
    render(<OrgMemberList members={members} columns={columns} />);
    expect(screen.getByText("Alice Owner")).toBeInTheDocument();
    expect(screen.getByText("Bob Admin")).toBeInTheDocument();
    expect(screen.getByText("Carol Member")).toBeInTheDocument();
  });

  it("renders member emails", () => {
    render(<OrgMemberList members={members} columns={columns} />);
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("carol@example.com")).toBeInTheDocument();
  });

  describe("role badge variants", () => {
    it("maps owner role to info badge", () => {
      render(<OrgMemberList members={members} columns={columns} />);
      const ownerBadge = screen.getByText("Owner");
      expect(ownerBadge.className).toContain("bg-blue-50");
    });

    it("maps admin role to warning badge", () => {
      render(<OrgMemberList members={members} columns={columns} />);
      const adminBadge = screen.getByText("Admin");
      expect(adminBadge.className).toContain("bg-yellow-50");
    });

    it("maps member role to success badge", () => {
      render(<OrgMemberList members={members} columns={columns} />);
      const memberBadge = screen.getByText("Member");
      expect(memberBadge.className).toContain("bg-green-50");
    });
  });

  describe("avatars", () => {
    it("shows initials fallback when avatarUrl is null", () => {
      render(<OrgMemberList members={members} columns={columns} />);
      expect(screen.getByLabelText("Alice Owner")).toHaveTextContent("AO");
    });

    it("shows image when avatarUrl is provided", () => {
      render(<OrgMemberList members={members} columns={columns} />);
      expect(screen.getByAltText("Bob Admin")).toBeInTheDocument();
    });
  });

  it("renders member actions when provided", () => {
    render(<OrgMemberList members={members} columns={columns} />);
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("renders empty table when no members", () => {
    render(<OrgMemberList members={[]} columns={columns} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    // Table body should be empty
    const tbody = screen
      .getByText("Name")
      .closest("table")
      ?.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });

  it("applies custom className", () => {
    const { container } = render(
      <OrgMemberList members={members} columns={columns} className="mt-8" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("mt-8");
  });
});
