import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/billing", () => ({
  resumeSubscription: vi.fn(),
}));

import { ResumeSubscriptionButton } from "@/app/[locale]/(app)/subscription/_components/ResumeSubscriptionButton";

describe("ResumeSubscriptionButton", () => {
  it("renders a button labelled with the children", () => {
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("uses the primary variant", () => {
    render(<ResumeSubscriptionButton>Resume</ResumeSubscriptionButton>);
    const button = screen.getByRole("button", { name: "Resume" });
    expect(button.className).toMatch(/bg-primary|primary/);
  });
});
