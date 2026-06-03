import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

// The hook reads NEXT_PUBLIC_RECAPTCHA_SITE_KEY at module-load time, so each
// test stubs the env (when needed), resets the module registry, then imports
// the hook fresh via dynamic import.

interface MockGrecaptcha {
  ready: (cb: () => void) => void;
  execute: ReturnType<typeof vi.fn>;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete (window as unknown as { grecaptcha?: MockGrecaptcha }).grecaptcha;
});

async function loadHook() {
  vi.resetModules();
  const mod = await import("@/lib/recaptcha/useRecaptcha");
  return mod.useRecaptcha;
}

describe("useRecaptcha", () => {
  it("resolves null when no site key is configured (captcha disabled)", async () => {
    const useRecaptcha = await loadHook();
    const { result } = renderHook(() => useRecaptcha());
    await expect(result.current("register")).resolves.toBeNull();
  });

  it("executes grecaptcha and resolves the token when a site key is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "site-key");
    (window as unknown as { grecaptcha: MockGrecaptcha }).grecaptcha = {
      ready: (cb) => cb(),
      execute: vi.fn().mockResolvedValue("tok-123"),
    };

    const useRecaptcha = await loadHook();
    const { result } = renderHook(() => useRecaptcha());

    await expect(result.current("register")).resolves.toBe("tok-123");
    expect(
      (window as unknown as { grecaptcha: MockGrecaptcha }).grecaptcha.execute,
    ).toHaveBeenCalledWith("site-key", { action: "register" });
  });

  it("resolves null when grecaptcha.execute rejects", async () => {
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "site-key");
    (window as unknown as { grecaptcha: MockGrecaptcha }).grecaptcha = {
      ready: (cb) => cb(),
      execute: vi.fn().mockRejectedValue(new Error("recaptcha boom")),
    };

    const useRecaptcha = await loadHook();
    const { result } = renderHook(() => useRecaptcha());

    await expect(result.current("forgot_password")).resolves.toBeNull();
  });
});
