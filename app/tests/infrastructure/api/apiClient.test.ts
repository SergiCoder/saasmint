import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";

const mockGetSession = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getSession: mockGetSession },
  }),
}));

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

// Import after mocks are set up
const { getAuthToken, apiFetch } =
  await import("@/infrastructure/api/apiClient");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthToken", () => {
  it("returns the access token from the active session", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok_abc" } },
    });

    const token = await getAuthToken();
    expect(token).toBe("tok_abc");
  });

  it("throws AuthError when no session exists", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    await expect(getAuthToken()).rejects.toThrow(AuthError);
    await expect(getAuthToken()).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});

describe("apiFetch", () => {
  it("constructs the correct URL with default base", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1 }),
    });

    await apiFetch("/account/", "tok_abc");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/account/",
      expect.any(Object),
    );
  });

  it("sends Authorization header with bearer token", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/account/", "my-token");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  it("sends Content-Type application/json by default", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test/", "tok");

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("merges custom options (method, body)", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ created: true }),
    });

    const body = JSON.stringify({ name: "Test" });
    await apiFetch("/orgs/", "tok", { method: "POST", body });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        body,
      }),
    );
  });

  it("parses and returns JSON on 200", async () => {
    const payload = { id: "u1", email: "alice@example.com" };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(payload),
    });

    const result = await apiFetch("/account/", "tok");
    expect(result).toEqual(payload);
  });

  it("returns undefined on 204 No Content", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetch("/orgs/o1/members/u1/", "tok", {
      method: "DELETE",
    });
    expect(result).toBeUndefined();
  });

  it("throws an error with status and body on non-2xx response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve("Bad Request"),
    });

    await expect(apiFetch("/account/", "tok")).rejects.toThrow(
      "API 400: Bad Request",
    );
  });

  it("throws on 404 with API prefix", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(apiFetch("/billing/subscription/", "tok")).rejects.toThrow(
      "API 404: Not Found",
    );
  });

  it("throws on 500 server error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(apiFetch("/account/", "tok")).rejects.toThrow(
      "API 500: Internal Server Error",
    );
  });

  it("allows custom headers to override defaults", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test/", "tok", {
      headers: { "Content-Type": "text/plain" },
    });

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["Content-Type"]).toBe("text/plain");
  });
});
