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
});
