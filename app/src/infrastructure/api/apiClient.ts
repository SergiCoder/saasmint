import { cache } from "react";
import { ApiError } from "@/domain/errors/ApiError";
import { AuthError } from "@/domain/errors/AuthError";
import { NetworkError } from "@/domain/errors/NetworkError";
import { getAccessToken } from "@/infrastructure/auth/cookies";
import { env } from "@/lib/env";
import { isRecord } from "@/lib/typeGuards";

const API_URL = env.NEXT_PUBLIC_API_URL;

// Wrapped with React.cache so that multiple apiFetch() calls within a single
// server render share one cookie read instead of repeating it per request.
export const getAuthToken = cache(_getAuthToken);

async function _getAuthToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new AuthError("No active session", "NO_SESSION");
  return token;
}

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const cause = err.cause;
  if (isRecord(cause) && typeof cause.code === "string") {
    return ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(
      cause.code,
    );
  }
  // Node 18+ fetch: "fetch failed" with a cause; older runtimes: "Failed to fetch" / "NetworkError"
  return /\bfetch failed\b|Failed to fetch|NetworkError/i.test(err.message);
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function raw(
  path: string,
  options: RequestInit,
  authToken: string | null,
): Promise<Response> {
  const headers = new Headers();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      headers: Object.fromEntries(headers.entries()),
    });
  } catch (err) {
    if (isNetworkError(err)) {
      throw new NetworkError(
        "Unable to reach the server. Please try again later.",
        { cause: err },
      );
    }
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    const body = parseBody(text);
    if (authToken && res.status === 401) {
      let code = "BACKEND_REJECTED";
      if (isRecord(body) && typeof body.code === "string") {
        code = body.code;
      }
      throw new AuthError("API 401", code);
    }
    throw new ApiError(res.status, body);
  }

  return res;
}

/**
 * Every typed `apiFetch*` returns a JSON object — i.e. a `Record<string,
 * unknown>`. Callers MUST narrow the result through a Zod schema (`SomeSchema
 * .parse(raw)`) before reading typed fields; the schema parse is the only
 * runtime guarantee. The previous signature accepted a generic `T` so
 * callers could declare the typed shape upfront, but the underlying cast was
 * unsound — TypeScript cannot prove the response shape at runtime — so the
 * generic has been removed in favour of always handing the caller the raw
 * record and letting `parse()` do the narrowing.
 */
async function readJson(res: Response): Promise<Record<string, unknown>> {
  // `res.json()` returns `unknown`. Validate the object shape here so a
  // backend that returns an array, primitive, or `null` surfaces as a clean
  // `ApiError` instead of crashing inside `keysToCamel`/`Object.entries` in
  // a downstream gateway. Downstream callers still narrow via Zod.
  const json: unknown = await res.json();
  if (!isRecord(json)) {
    throw new ApiError(res.status, json, "UNEXPECTED_RESPONSE_SHAPE");
  }
  return json;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const token = await getAuthToken();
  const res = await raw(path, options, token);
  return readJson(res);
}

/**
 * Fetch that sends the access token when present but silently falls through
 * to an unauthenticated request when the token is missing OR rejected. Use
 * for endpoints that personalize the response for logged-in users but work
 * anonymously too (e.g. plans list, where pricing adjusts to the user's
 * preferred currency). A stale/invalid token that makes it past the
 * middleware refresh must not crash the anonymous render path.
 */
export async function apiFetchOptional(
  path: string,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  try {
    const res = await raw(path, options, token ?? null);
    return readJson(res);
  } catch (err) {
    if (token && err instanceof AuthError) {
      const res = await raw(path, options, null);
      return readJson(res);
    }
    throw err;
  }
}

export async function apiFetchVoid(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  const token = await getAuthToken();
  await raw(path, options, token);
}

export async function publicApiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Record<string, unknown>> {
  const res = await raw(path, options, null);
  return readJson(res);
}

export async function publicApiFetchVoid(
  path: string,
  options: RequestInit = {},
): Promise<void> {
  await raw(path, options, null);
}
