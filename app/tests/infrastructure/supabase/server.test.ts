import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetAll = vi.fn().mockReturnValue([]);
const mockSet = vi.fn();
const mockCreateServerClient = vi.fn().mockReturnValue({ auth: {} });

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: mockGetAll,
    set: mockSet,
  }),
}));

const { createClient } = await import("@/infrastructure/supabase/server");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-123");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createClient (server)", () => {
  it("calls createServerClient with env vars and cookie handlers", async () => {
    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledOnce();
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "anon-key-123",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    );
  });

  it("returns the client created by createServerClient", async () => {
    const fakeClient = { auth: { getSession: vi.fn() } };
    mockCreateServerClient.mockReturnValue(fakeClient);

    const client = await createClient();

    expect(client).toBe(fakeClient);
  });

  it("cookie getAll delegates to cookieStore.getAll", async () => {
    const fakeCookies = [{ name: "sb-token", value: "abc" }];
    mockGetAll.mockReturnValue(fakeCookies);

    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
    const result = cookiesConfig.getAll();

    expect(mockGetAll).toHaveBeenCalled();
    expect(result).toEqual(fakeCookies);
  });

  it("cookie setAll delegates to cookieStore.set for each cookie", async () => {
    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;
    const cookiesToSet = [
      { name: "sb-token", value: "abc", options: { path: "/" } },
      { name: "sb-refresh", value: "def", options: { path: "/" } },
    ];
    cookiesConfig.setAll(cookiesToSet);

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith("sb-token", "abc", { path: "/" });
    expect(mockSet).toHaveBeenCalledWith("sb-refresh", "def", { path: "/" });
  });

  it("cookie setAll silently catches errors from Server Components", async () => {
    mockSet.mockImplementation(() => {
      throw new Error("Cannot set cookies in Server Component");
    });

    await createClient();

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies;

    // Should not throw — error is swallowed
    expect(() =>
      cookiesConfig.setAll([{ name: "sb-token", value: "abc", options: {} }]),
    ).not.toThrow();
  });
});
