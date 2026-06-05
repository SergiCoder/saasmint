import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Locale } from "@/lib/i18n/routing";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter-var" }),
}));

vi.mock("../../src/app/globals.css", () => ({}));

const getLocaleMock = vi.fn<() => Promise<Locale>>(async () => "en");

vi.mock("@/lib/pathname", () => ({
  getLocale: () => getLocaleMock(),
}));

import RootLayout from "@/app/layout";

// getLocale() is mocked, so the helper takes the locale directly. Locale
// resolution from a pathname is covered by the unit tests for getLocale()
// in tests/lib/pathname.test.ts.
async function renderRoot(locale: Locale = "en"): Promise<void> {
  getLocaleMock.mockResolvedValueOnce(locale);
  const element = await RootLayout({ children: "body-content" });
  render(element as React.ReactElement);
}

describe("RootLayout", () => {
  beforeEach(() => {
    getLocaleMock.mockReset();
    getLocaleMock.mockResolvedValue("en");
  });

  it("renders lang='en' and dir='ltr' for a Western locale", async () => {
    await renderRoot("en");

    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(document.body.textContent).toContain("body-content");
  });

  it("renders dir='rtl' for Arabic", async () => {
    await renderRoot("ar");

    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("renders multi-segment locales such as pt-BR", async () => {
    await renderRoot("pt-BR");

    expect(document.documentElement.getAttribute("lang")).toBe("pt-BR");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("applies the inter font variable to the body", async () => {
    await renderRoot();

    expect(document.body.className).toContain("font-inter-var");
  });
});
