import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreateBrowserClient = vi.fn().mockReturnValue({ auth: {} });

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}));

const { createClient } = await import("@/infrastructure/supabase/client");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createClient (browser)", () => {
  it("calls createBrowserClient with env vars", () => {
    createClient();

    expect(mockCreateBrowserClient).toHaveBeenCalledOnce();
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "anon-key-123",
    );
  });

  it("returns the client created by createBrowserClient", () => {
    const fakeClient = { auth: { getSession: vi.fn() } };
    mockCreateBrowserClient.mockReturnValue(fakeClient);

    const client = createClient();

    expect(client).toBe(fakeClient);
  });
});
