import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// next/font/google — Tailwind+jsdom can't run the real font loader.
vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter-var" }),
}));

// globals.css side-effect import — CSS resolution is not needed here.
vi.mock("../globals.css", () => ({}));

// next-intl pieces the layout pulls in. Module-level vi.fn()s so we can
// assert on setRequestLocale per-test.
const setRequestLocaleMock = vi.fn();
const getMessagesMock = vi.fn(async () => ({ hello: "world" }));

vi.mock("next-intl/server", () => ({
  setRequestLocale: (locale: string) => setRequestLocaleMock(locale),
  getMessages: () => getMessagesMock(),
}));

vi.mock("next-intl", async () => {
  const React = await import("react");
  return {
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
}));

import LocaleLayout, {
  generateStaticParams,
  metadata,
} from "@/app/[locale]/layout";
import { routing } from "@/lib/i18n/routing";

// The layout returns <html>/<body>. jsdom can't mount those under a div, so
// render into the document itself and read attributes off documentElement.
async function renderLayout(locale: string): Promise<void> {
  const element = await LocaleLayout({
    children: "body-content",
    params: Promise.resolve({ locale }),
  });
  render(element as React.ReactElement);
}

describe("LocaleLayout", () => {
  beforeEach(() => {
    setRequestLocaleMock.mockClear();
    getMessagesMock.mockClear();
    notFoundMock.mockClear();
  });

  it("generateStaticParams returns one entry per supported locale", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(routing.locales.length);
    expect(params).toContainEqual({ locale: "en" });
    expect(params).toContainEqual({ locale: "ar" });
    expect(params).toContainEqual({ locale: "pt-BR" });
  });

  it("exports SaaSmint metadata with title template and OG site name", () => {
    expect(metadata.title).toEqual({
      default: "SaaSmint",
      template: "%s | SaaSmint",
    });
    expect(metadata.openGraph?.siteName).toBe("SaaSmint");
    // metadataBase is a URL parsed from NEXT_PUBLIC_APP_URL.
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("renders an LTR locale with lang + dir='ltr'", async () => {
    await renderLayout("en");

    const html = document.documentElement;
    expect(html.getAttribute("lang")).toBe("en");
    expect(html.getAttribute("dir")).toBe("ltr");
    expect(setRequestLocaleMock).toHaveBeenCalledWith("en");
    expect(getMessagesMock).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toContain("body-content");
  });

  it("renders Arabic as dir='rtl'", async () => {
    await renderLayout("ar");

    const html = document.documentElement;
    expect(html.getAttribute("lang")).toBe("ar");
    expect(html.getAttribute("dir")).toBe("rtl");
    expect(setRequestLocaleMock).toHaveBeenCalledWith("ar");
  });

  it("treats non-Arabic locales (e.g. Hebrew-like prefix) as LTR", async () => {
    // Every locale except "ar" is LTR in RTL_LOCALES. Sanity-check a
    // regional variant.
    await renderLayout("pt-BR");

    expect(document.documentElement.getAttribute("dir")).toBe("ltr");
    expect(document.documentElement.getAttribute("lang")).toBe("pt-BR");
  });

  it("calls notFound() for an unsupported locale", async () => {
    await expect(
      LocaleLayout({
        children: "ignored",
        params: Promise.resolve({ locale: "xx" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
    // Must short-circuit before touching next-intl.
    expect(setRequestLocaleMock).not.toHaveBeenCalled();
    expect(getMessagesMock).not.toHaveBeenCalled();
  });
});
