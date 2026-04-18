/* eslint-disable @next/next/no-html-link-for-pages */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { MobileMenuToggle } from "@/presentation/components/organisms/MobileMenuToggle";

describe("MobileMenuToggle", () => {
  it("renders the toggle button with the provided aria-label", () => {
    render(
      <MobileMenuToggle toggleNavLabel="Open menu">
        <a href="/dashboard">Dashboard</a>
      </MobileMenuToggle>,
    );
    const btn = screen.getByRole("button", { name: "Open menu" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("hides the children panel when closed", () => {
    render(
      <MobileMenuToggle toggleNavLabel="Open menu">
        <a href="/dashboard">Dashboard</a>
      </MobileMenuToggle>,
    );
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("reveals the children panel after a click", async () => {
    const user = userEvent.setup();
    render(
      <MobileMenuToggle toggleNavLabel="Open menu">
        <a href="/dashboard">Dashboard</a>
      </MobileMenuToggle>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("hides the panel on a second click (toggle off)", async () => {
    const user = userEvent.setup();
    render(
      <MobileMenuToggle toggleNavLabel="Open menu">
        <a href="/dashboard">Dashboard</a>
      </MobileMenuToggle>,
    );

    const btn = screen.getByRole("button", { name: "Open menu" });
    await user.click(btn);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();

    await user.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("swaps the inner icon path when toggled", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MobileMenuToggle toggleNavLabel="Open menu">
        <span>child</span>
      </MobileMenuToggle>,
    );

    const closedPath = container.querySelector("path")?.getAttribute("d");
    expect(closedPath).toBe("M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5");

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    const openPath = container.querySelector("path")?.getAttribute("d");
    expect(openPath).toBe("M6 18L18 6M6 6l12 12");
    expect(openPath).not.toBe(closedPath);
  });

  it("renders arbitrary ReactNode children in the panel", async () => {
    const user = userEvent.setup();
    render(
      <MobileMenuToggle toggleNavLabel="Open menu">
        <div>
          <a href="/a">Alpha</a>
          <a href="/b">Beta</a>
          <button>Sign Out</button>
        </div>
      </MobileMenuToggle>,
    );

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });
});
