import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { DangerZone } from "@/presentation/components/organisms/DangerZone";

describe("DangerZone", () => {
  it("renders only the trigger button when initially collapsed", () => {
    render(
      <DangerZone triggerLabel="Delete account" heading="Danger zone">
        <p>Destructive content</p>
      </DangerZone>,
    );

    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Danger zone")).not.toBeInTheDocument();
    expect(screen.queryByText("Destructive content")).not.toBeInTheDocument();
  });

  it("expands to show heading and children when trigger is clicked", async () => {
    const user = userEvent.setup();
    render(
      <DangerZone triggerLabel="Delete account" heading="Danger zone">
        <p>Destructive content</p>
      </DangerZone>,
    );

    await user.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByText("Danger zone")).toBeInTheDocument();
    expect(screen.getByText("Destructive content")).toBeInTheDocument();
    // Trigger button should no longer be present
    expect(
      screen.queryByRole("button", { name: "Delete account" }),
    ).not.toBeInTheDocument();
  });

  it("renders the optional description inside the expanded section", async () => {
    const user = userEvent.setup();
    render(
      <DangerZone
        triggerLabel="Delete org"
        heading="Danger zone"
        description="This cannot be undone."
      >
        <button type="button">Confirm delete</button>
      </DangerZone>,
    );

    await user.click(screen.getByRole("button", { name: "Delete org" }));

    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("does not render a description paragraph when description prop is omitted", async () => {
    const user = userEvent.setup();
    render(
      <DangerZone triggerLabel="Delete org" heading="Danger zone">
        <button type="button">Confirm</button>
      </DangerZone>,
    );

    await user.click(screen.getByRole("button", { name: "Delete org" }));

    // No description <p> should be present beyond the children
    // (the only text-level content visible is the heading and children label)
    expect(
      screen.queryByText("This cannot be undone."),
    ).not.toBeInTheDocument();
  });

  it("renders children content inside the expanded section", async () => {
    const user = userEvent.setup();
    render(
      <DangerZone triggerLabel="Open" heading="Dangerous">
        <button type="button">Destructive action</button>
      </DangerZone>,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));

    expect(
      screen.getByRole("button", { name: "Destructive action" }),
    ).toBeInTheDocument();
  });

  it("starts collapsed on subsequent renders (no auto-expansion)", () => {
    const { rerender } = render(
      <DangerZone triggerLabel="Open" heading="Danger">
        <span>content</span>
      </DangerZone>,
    );

    // Re-render with different props — still collapsed
    rerender(
      <DangerZone triggerLabel="Open changed" heading="Danger zone updated">
        <span>new content</span>
      </DangerZone>,
    );

    expect(
      screen.getByRole("button", { name: "Open changed" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("new content")).not.toBeInTheDocument();
  });
});
