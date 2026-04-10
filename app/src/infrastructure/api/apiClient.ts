import { cache } from "react";
import { AuthError } from "@/domain/errors/AuthError";
import { getAccessToken } from "@/infrastructure/auth/cookies";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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
  const cause = (err as TypeError & { cause?: { code?: string } }).cause;
  if (cause && typeof cause.code === "string") {
    return ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"].includes(
      cause.code,
    );
  }
  // Node 18+ fetch: "fetch failed" with a cause; older runtimes: "Failed to fetch" / "NetworkError"
  return /\bfetch failed\b|Failed to fetch|NetworkError/i.test(err.message);
}

async function request<T>(
  path: string,
  options: RequestInit,
  authToken: string | null,
): Promise<T> {
  const headers = new Headers();
  if (authToken) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  if (options.body) {
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
      throw new Error("Unable to reach the server. Please try again later.");
    }
    throw err;
  }

  if (!res.ok) {
    const text = await res.text();
    if (authToken && res.status === 401) {
      let code = "BACKEND_REJECTED";
      try {
        const body = JSON.parse(text) as { code?: string };
        if (typeof body.code === "string") code = body.code;
      } catch {
        // non-JSON body — use generic code
      }
      throw new AuthError(`API 401: ${text}`, code);
    }
    throw new Error(`API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  return request<T>(path, options, token);
}

export async function publicApiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return request<T>(path, options, null);
}
