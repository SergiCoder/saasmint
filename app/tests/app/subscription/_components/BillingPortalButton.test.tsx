import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/app/actions/billing", () => ({
  openBillingPortal: vi.fn(),
}));

import { BillingPortalButton } from "@/app/[locale]/(app)/subscription/_components/BillingPortalButton";

describe("BillingPortalButton", () => {
  it("renders a button labelled with the children", () => {
    render(<BillingPortalButton>Manage billing</BillingPortalButton>);
    expect(
      screen.getByRole("button", { name: "Manage billing" }),
    ).toBeInTheDocument();
  });

  it("omits the hidden context input when context prop is not set", () => {
    const { container } = render(
      <BillingPortalButton>Manage billing</BillingPortalButton>,
    );
    expect(
      container.querySelector('input[name="context"]'),
    ).not.toBeInTheDocument();
  });

  it("forwards the context prop as a hidden form field", () => {
    // Concurrent personal+team billers (rule 5) MUST send ?context= so the
    // backend doesn't fall back to its account-type default and route a
    // "manage personal" click into the team customer's portal.
    const { container } = render(
      <BillingPortalButton context="team">Manage</BillingPortalButton>,
    );
    const hidden = container.querySelector(
      'input[name="context"]',
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("team");
  });

  it("renders the secondary variant", () => {
    render(<BillingPortalButton>Manage</BillingPortalButton>);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-variant",
      "secondary",
    );
  });
});
