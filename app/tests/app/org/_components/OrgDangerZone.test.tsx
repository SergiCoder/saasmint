import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { OrgDangerZone } from "@/app/[locale]/(app)/org/[slug]/_components/OrgDangerZone";

describe("OrgDangerZone", () => {
  it("renders the collapsed trigger button initially", () => {
    render(<OrgDangerZone />);
    expect(
      screen.getByRole("button", { name: "deleteOrg" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("dangerZone")).not.toBeInTheDocument();
  });

  it("expands to show danger zone content when clicked", async () => {
    const user = userEvent.setup();
    render(<OrgDangerZone />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));

    expect(screen.getByText("dangerZone")).toBeInTheDocument();
    expect(
      screen.getByText("deleteOrgBlockedSubscription"),
    ).toBeInTheDocument();
  });

  it("hides the trigger button after expanding", async () => {
    const user = userEvent.setup();
    render(<OrgDangerZone />);

    await user.click(screen.getByRole("button", { name: "deleteOrg" }));

    expect(
      screen.queryByRole("button", { name: "deleteOrg" }),
    ).not.toBeInTheDocument();
  });
});
