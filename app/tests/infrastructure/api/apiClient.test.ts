import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser, getSession: mockGetSession },
  }),
}));

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

// Import after mocks are set up
const { getAuthToken, apiFetch } =
  await import("@/infrastructure/api/apiClient");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u1" } },
  });
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "tok_abc" } },
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthToken", () => {
  it("returns the access token from the active session", async () => {
    const token = await getAuthToken();
    expect(token).toBe("tok_abc");
  });

  it("throws AuthError when no user exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    await expect(getAuthToken()).rejects.toThrow(AuthError);
    await expect(getAuthToken()).rejects.toMatchObject({
      code: "NO_SESSION",
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

    await apiFetch("/account/");

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/account/",
      expect.any(Object),
    );
  });

  it("sends Authorization header with bearer token from session", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/account/");

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer tok_abc",
          "content-type": "application/json",
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

    await apiFetch("/test/");

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["content-type"]).toBe("application/json");
  });

  it("merges custom options (method, body)", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ created: true }),
    });

    const body = JSON.stringify({ name: "Test" });
    await apiFetch("/orgs/", { method: "POST", body });

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

    const result = await apiFetch("/account/");
    expect(result).toEqual(payload);
  });

  it("returns undefined on 204 No Content", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
    });

    const result = await apiFetch("/orgs/o1/members/u1/", {
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

    await expect(apiFetch("/account/")).rejects.toThrow("API 400: Bad Request");
  });

  it("throws on 404 with API prefix", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(apiFetch("/billing/subscription/")).rejects.toThrow(
      "API 404: Not Found",
    );
  });

  it("throws on 500 server error", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(apiFetch("/account/")).rejects.toThrow(
      "API 500: Internal Server Error",
    );
  });

  it("allows custom headers to override defaults", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test/", {
      headers: { "Content-Type": "text/plain" },
    });

    const headers = fetchSpy.mock.calls[0][1].headers;
    expect(headers["content-type"]).toBe("text/plain");
  });

  it("throws AuthError with BACKEND_REJECTED on 401 response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    await expect(apiFetch("/account/")).rejects.toThrow(AuthError);
    await expect(apiFetch("/account/")).rejects.toMatchObject({
      code: "BACKEND_REJECTED",
    });
  });

  it("throws AuthError when no user exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    await expect(apiFetch("/account/")).rejects.toThrow(AuthError);
  });
});
