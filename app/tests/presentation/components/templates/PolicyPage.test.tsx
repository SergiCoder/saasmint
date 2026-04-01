import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockTranslate = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    title: "Privacy Policy",
    lastUpdated: "Last updated: Jan 1, 2026",
    intro: "We care about your privacy.",
  };
  return translations[key] ?? key;
});

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockImplementation(() => mockTranslate),
}));

import { PolicyPage } from "@/presentation/components/templates";

describe("PolicyPage", () => {
  it("renders the page title", async () => {
    const Component = await PolicyPage({ namespace: "privacy" });
    render(Component);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
  });

  it("renders the last updated date", async () => {
    const Component = await PolicyPage({ namespace: "privacy" });
    render(Component);
    expect(screen.getByText("Last updated: Jan 1, 2026")).toBeInTheDocument();
  });

  it("renders the intro paragraph", async () => {
    const Component = await PolicyPage({ namespace: "privacy" });
    render(Component);
    expect(screen.getByText("We care about your privacy.")).toBeInTheDocument();
  });

  it("renders title as h1", async () => {
    const Component = await PolicyPage({ namespace: "privacy" });
    render(Component);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Privacy Policy");
  });

  it("calls getTranslations with the provided namespace", async () => {
    const { getTranslations } = await import("next-intl/server");
    await PolicyPage({ namespace: "terms" });
    expect(getTranslations).toHaveBeenCalledWith("terms");
  });
});
