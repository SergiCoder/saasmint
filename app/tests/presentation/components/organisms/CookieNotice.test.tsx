import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

const PROPS = {
  message: "We use only strictly-necessary cookies to make this site work.",
  learnMoreLabel: "Learn more",
  learnMoreHref: "/cookies",
  dismissLabel: "Got it",
  regionLabel: "Cookie notice",
};

const DISMISS_KEY = "cookie-notice-dismissed";

// The component reads `process.env.NEXT_PUBLIC_COOKIE_BANNER` at module-eval
// time (so Next can inline it), so stub the env and re-import per case.
async function loadCookieNotice(flag: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_COOKIE_BANNER", flag);
  const mod = await import("@/presentation/components/organisms/CookieNotice");
  return mod.CookieNotice;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  localStorage.clear();
});

describe("CookieNotice", () => {
  it("renders nothing when the flag is disabled", async () => {
    const CookieNotice = await loadCookieNotice("");
    render(<CookieNotice {...PROPS} />);
    expect(
      screen.queryByRole("region", { name: "Cookie notice" }),
    ).toBeNull();
  });

  it("renders the notice when enabled and not previously dismissed", async () => {
    const CookieNotice = await loadCookieNotice("true");
    render(<CookieNotice {...PROPS} />);

    expect(
      screen.getByRole("region", { name: "Cookie notice" }),
    ).toBeInTheDocument();
    expect(screen.getByText(PROPS.message, { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "/cookies",
    );
    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
  });

  it("renders nothing when already dismissed in localStorage", async () => {
    localStorage.setItem(DISMISS_KEY, "true");
    const CookieNotice = await loadCookieNotice("true");
    render(<CookieNotice {...PROPS} />);
    expect(
      screen.queryByRole("region", { name: "Cookie notice" }),
    ).toBeNull();
  });

  it("dismiss control persists to localStorage and hides the notice", async () => {
    const CookieNotice = await loadCookieNotice("true");
    render(<CookieNotice {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(localStorage.getItem(DISMISS_KEY)).toBe("true");
    expect(
      screen.queryByRole("region", { name: "Cookie notice" }),
    ).toBeNull();
  });

  it("sets no cookie when dismissed (localStorage only)", async () => {
    const CookieNotice = await loadCookieNotice("true");
    render(<CookieNotice {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(document.cookie).not.toContain("cookie-notice");
  });
});
