import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

// `next/script` is a framework component that doesn't render a real `<script>`
// tag in jsdom — stub it as a plain element so tests can assert on the props it
// receives without triggering real network fetches.
vi.mock("next/script", () => ({
  default: ({
    src,
    strategy,
    nonce,
  }: {
    src: string;
    strategy: string;
    nonce?: string;
  }) => (
    <script
      data-testid="recaptcha-script"
      data-src={src}
      data-strategy={strategy}
      nonce={nonce}
    />
  ),
}));

// `getCspNonce` reads request headers (server-only). Mock it so the async
// Server Component can be rendered in the jsdom test environment.
const mockGetCspNonce = vi.fn<() => Promise<string | null>>();
vi.mock("@/lib/pathname", () => ({
  getCspNonce: () => mockGetCspNonce(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  mockGetCspNonce.mockReset();
});

async function loadComponent() {
  vi.resetModules();
  const mod = await import("@/lib/recaptcha/RecaptchaScript");
  return mod.RecaptchaScript;
}

describe("RecaptchaScript", () => {
  it("renders nothing when no site key is configured", async () => {
    // NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set (empty by default in env.ts).
    const RecaptchaScript = await loadComponent();
    const result = await RecaptchaScript();

    expect(result).toBeNull();
  });

  it("renders a Script tag with the correct src when a site key is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "test-site-key");
    mockGetCspNonce.mockResolvedValue(null);

    const RecaptchaScript = await loadComponent();
    const element = await RecaptchaScript();
    const { container } = render(element as React.ReactElement);

    const scriptEl = container.querySelector(
      '[data-testid="recaptcha-script"]',
    );
    expect(scriptEl).toBeInTheDocument();
    expect(scriptEl).toHaveAttribute(
      "data-src",
      "https://www.google.com/recaptcha/api.js?render=test-site-key",
    );
    expect(scriptEl).toHaveAttribute("data-strategy", "afterInteractive");
  });

  it("forwards the CSP nonce onto the Script tag when one is present", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "test-site-key");
    mockGetCspNonce.mockResolvedValue("nonce-abc123");

    const RecaptchaScript = await loadComponent();
    const element = await RecaptchaScript();
    const { container } = render(element as React.ReactElement);

    const scriptEl = container.querySelector(
      '[data-testid="recaptcha-script"]',
    );
    expect(scriptEl).toHaveAttribute("nonce", "nonce-abc123");
  });

  it("renders Script tag without a nonce attribute when getCspNonce returns null", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "test-site-key");
    mockGetCspNonce.mockResolvedValue(null);

    const RecaptchaScript = await loadComponent();
    const element = await RecaptchaScript();
    const { container } = render(element as React.ReactElement);

    const scriptEl = container.querySelector(
      '[data-testid="recaptcha-script"]',
    );
    // nonce={undefined} — no nonce attribute should be set.
    expect(scriptEl?.getAttribute("nonce")).toBeNull();
  });
});
