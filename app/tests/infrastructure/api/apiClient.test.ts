import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "@/domain/errors/ApiError";
import { AuthError } from "@/domain/errors/AuthError";

const mockGetAccessToken = vi.fn();

vi.mock("@/infrastructure/auth/cookies", () => ({
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
}));

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

// Import after mocks are set up
const {
  getAuthToken,
  apiFetch,
  apiFetchVoid,
  apiFetchOptional,
  publicApiFetch,
  publicApiFetchVoid,
} = await import("@/infrastructure/api/apiClient");

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAccessToken.mockResolvedValue("tok_abc");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAuthToken", () => {
  it("returns the access token from the cookie", async () => {
    const token = await getAuthToken();
    expect(token).toBe("tok_abc");
  });

  it("throws AuthError when no token exists", async () => {
    mockGetAccessToken.mockResolvedValue(undefined);

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
      "https://localhost:8443/api/v1/account/",
      expect.any(Object),
    );
  });

  it("sends Authorization header with bearer token from cookie", async () => {
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
        }),
      }),
    );
  });

  it("sets Content-Type application/json only when body is present", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/test/");
    expect(fetchSpy.mock.calls[0]![1].headers["content-type"]).toBeUndefined();

    fetchSpy.mockClear();
    await apiFetch("/test/", { method: "POST", body: JSON.stringify({}) });
    expect(fetchSpy.mock.calls[0]![1].headers["content-type"]).toBe(
      "application/json",
    );
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

  it("apiFetchVoid resolves on 204 No Content without parsing body", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 204,
    });

    await expect(
      apiFetchVoid("/orgs/o1/members/u1/", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("throws ApiError with status and parsed JSON body on non-2xx", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ detail: "Bad Request" })),
    });

    await expect(apiFetch("/account/")).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch("/account/")).rejects.toMatchObject({
      status: 400,
      body: { detail: "Bad Request" },
    });
  });

  it("throws ApiError with raw text body when response is not JSON", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    await expect(apiFetch("/account/")).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch("/account/")).rejects.toMatchObject({
      status: 500,
      body: "Internal Server Error",
    });
  });

  it("throws ApiError with status 404 on not-found response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not Found"),
    });

    await expect(apiFetch("/billing/subscription/")).rejects.toMatchObject({
      status: 404,
    });
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

    const headers = fetchSpy.mock.calls[0]![1].headers;
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

  it("extracts custom code from 401 JSON body", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve(JSON.stringify({ code: "TOKEN_EXPIRED" })),
    });

    await expect(apiFetch("/account/")).rejects.toThrow(AuthError);
    await expect(apiFetch("/account/")).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
    });
  });

  it("throws AuthError when no token exists in cookie", async () => {
    mockGetAccessToken.mockResolvedValue(undefined);

    await expect(apiFetch("/account/")).rejects.toThrow(AuthError);
  });
});

describe("publicApiFetch", () => {
  it("constructs the correct URL without an Authorization header", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [{ id: "p1" }] }),
    });

    const result = await publicApiFetch("/billing/plans/");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://localhost:8443/api/v1/billing/plans/",
      expect.any(Object),
    );
    const headers = fetchSpy.mock.calls[0]![1].headers;
    expect(headers.authorization).toBeUndefined();
    expect(result).toEqual({ results: [{ id: "p1" }] });
  });

  it("does not read auth cookies", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [] }),
    });

    mockGetAccessToken.mockClear();
    await publicApiFetch("/billing/plans/");

    expect(mockGetAccessToken).not.toHaveBeenCalled();
  });

  it("sets Content-Type when a body is present", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await publicApiFetch("/public/", {
      method: "POST",
      body: JSON.stringify({ a: 1 }),
    });

    const headers = fetchSpy.mock.calls[0]![1].headers;
    expect(headers["content-type"]).toBe("application/json");
  });

  it("publicApiFetchVoid resolves on 204 without parsing body", async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 204 });
    await expect(publicApiFetchVoid("/public/")).resolves.toBeUndefined();
  });

  it("throws ApiError on non-2xx response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("boom"),
    });

    await expect(publicApiFetch("/billing/plans/")).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(publicApiFetch("/billing/plans/")).rejects.toMatchObject({
      status: 500,
      body: "boom",
    });
  });

  it("does NOT wrap 401 in AuthError (no auth token sent)", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    await expect(publicApiFetch("/billing/plans/")).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(publicApiFetch("/billing/plans/")).rejects.not.toBeInstanceOf(
      AuthError,
    );
  });

  it("rejects non-object JSON bodies with UNEXPECTED_RESPONSE_SHAPE", async () => {
    // A backend that returns a bare array, primitive, or `null` would crash
    // downstream `keysToCamel`/`Object.entries`; the readJson guard surfaces
    // a clean ApiError instead.
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([{ id: "p1" }]),
    });

    await expect(publicApiFetch("/billing/plans/")).rejects.toMatchObject({
      code: "UNEXPECTED_RESPONSE_SHAPE",
      status: 200,
    });
  });
});

describe("isNetworkError (via apiFetch)", () => {
  it("wraps ECONNREFUSED TypeError into a user-friendly message", async () => {
    const err = new TypeError("fetch failed");
    (err as TypeError & { cause: { code: string } }).cause = {
      code: "ECONNREFUSED",
    };
    fetchSpy.mockRejectedValue(err);

    await expect(apiFetch("/account/")).rejects.toThrow(
      "Unable to reach the server. Please try again later.",
    );
  });

  it("wraps 'fetch failed' TypeError without cause into a user-friendly message", async () => {
    fetchSpy.mockRejectedValue(new TypeError("fetch failed"));

    await expect(apiFetch("/account/")).rejects.toThrow(
      "Unable to reach the server. Please try again later.",
    );
  });

  it("does not wrap non-TypeError errors", async () => {
    fetchSpy.mockRejectedValue(new Error("something else"));

    await expect(apiFetch("/account/")).rejects.toThrow("something else");
  });
});

describe("apiFetchOptional", () => {
  it("sends Authorization header when a token is present", async () => {
    mockGetAccessToken.mockResolvedValue("tok_abc");
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [] }),
    });

    await apiFetchOptional("/billing/plans/");

    const headers = fetchSpy.mock.calls[0]![1].headers;
    expect(headers.authorization).toBe("Bearer tok_abc");
  });

  it("omits Authorization header when no token is present", async () => {
    mockGetAccessToken.mockResolvedValue(undefined);
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [] }),
    });

    await apiFetchOptional("/billing/plans/");

    const headers = fetchSpy.mock.calls[0]![1].headers;
    expect(headers.authorization).toBeUndefined();
  });

  it("retries anonymously when a stale token is rejected with 401", async () => {
    mockGetAccessToken.mockResolvedValue("stale-tok");
    fetchSpy
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"detail":"Invalid token"}'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

    const result = await apiFetchOptional("/billing/plans/");

    expect(result).toEqual({ results: [] });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const firstHeaders = fetchSpy.mock.calls[0]![1].headers;
    const secondHeaders = fetchSpy.mock.calls[1]![1].headers;
    expect(firstHeaders.authorization).toBe("Bearer stale-tok");
    expect(secondHeaders.authorization).toBeUndefined();
  });

  it("does not retry when no token was sent (propagates the error)", async () => {
    mockGetAccessToken.mockResolvedValue(undefined);
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('{"detail":"Server error"}'),
    });

    await expect(apiFetchOptional("/billing/plans/")).rejects.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("request forwarding", () => {
  // Pins the contract that the public helpers transparently forward their
  // RequestInit to fetch — the caller's signal, cache, credentials, custom
  // headers must reach the network layer untouched. A regression that
  // shallow-clones these out would silently break caller-driven aborts.
  it("forwards an AbortSignal to fetch so callers can cancel in-flight requests", async () => {
    const controller = new AbortController();
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/account/", { signal: controller.signal });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("rejects with the native AbortError when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    fetchSpy.mockImplementationOnce(() =>
      Promise.reject(
        Object.assign(new Error("aborted"), { name: "AbortError" }),
      ),
    );

    await expect(
      apiFetch("/account/", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("preserves caller-provided headers alongside the Authorization header", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiFetch("/account/", {
      headers: { "X-Request-Id": "abc-123" },
    });

    const headers = fetchSpy.mock.calls[0]![1].headers;
    expect(headers.authorization).toBe("Bearer tok_abc");
    expect(headers["x-request-id"]).toBe("abc-123");
  });
});

// Note on dedup coverage: `getAuthToken` is wrapped in React.cache() so
// multiple concurrent apiFetch calls within the same server render share
// one cookie read. The dedup is request-scoped — it only activates inside
// a real React render (AsyncLocalStorage-backed). Outside one, cache()
// falls through to a plain function call, so asserting "called once under
// Promise.all" isn't meaningful here. Left uncovered intentionally; the
// contract is enforced by the source code using `cache(...)` on export.
