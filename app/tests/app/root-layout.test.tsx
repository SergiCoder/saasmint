import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter-var" }),
}));

vi.mock("../../src/app/globals.css", () => ({}));

const getPathnameMock = vi.fn<() => Promise<string>>(async () => "/en");

vi.mock("@/lib/pathname", () => ({
  getPathname: () => getPathnameMock(),
}));

import RootLayout from "@/app/layout";

async function renderRoot(pathname: string): Promise<void> {
  getPathnameMock.mockResolvedValueOnce(pathname);
  const element = await RootLayout({ children: "body-content" });
  render(element as React.ReactElement);
}

describe("RootLayout", () => {
  beforeEach(() => {
    getPathnameMock.mockReset();
    getPathnameMock.mockResolvedValue("/en");
  });

  it("derives lang from the pathname locale prefix and renders LTR", async () => {
    await renderRoot("/en/dashboard");

    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(document.body.textContent).toContain("body-content");
  });

  it("renders dir='rtl' for an Arabic pathname", async () => {
    await renderRoot("/ar/dashboard");

    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });

  it("recognises multi-segment locales such as pt-BR", async () => {
    await renderRoot("/pt-BR");

    expect(document.documentElement.getAttribute("lang")).toBe("pt-BR");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("falls back to the default locale when the prefix is unknown", async () => {
    await renderRoot("/unknown/path");

    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
  });

  it("applies the inter font variable to the body", async () => {
    await renderRoot("/en");

    expect(document.body.className).toContain("font-inter-var");
  });
});
