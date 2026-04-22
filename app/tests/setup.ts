import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { translate } from "./_helpers/translate";

vi.mock("next-intl", () => ({
  useLocale: () => "en",
  useTranslations: () => translate,
  useMessages: () => ({}),
}));

vi.mock("@/lib/i18n/navigation", async () => {
  const React = await import("react");
  return {
    Link: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement("a", { href, ...props }, children),
    usePathname: () => "/",
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
    redirect: vi.fn(),
  };
});

/**
 * Silence `console.error` by default. Tests that need to assert on it can
 * still do so via `vi.mocked(console.error)` — they just don't need to
 * re-stub it. Restored after every test so the spy count stays clean.
 */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
});
