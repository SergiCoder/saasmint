import { cache } from "react";
import { AuthError } from "@/domain/errors/AuthError";
import { createClient } from "@/infrastructure/supabase/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// Wrapped with React.cache so that multiple apiFetch() calls within a single
// server render share one Supabase auth round-trip instead of validating the
// JWT once per request.
export const getAuthToken = cache(_getAuthToken);

async function _getAuthToken(): Promise<string> {
  const supabase = await createClient();
  // Validate and refresh the JWT before reading the access token.
  // getSession() alone reads stale cookies without server-side validation.
  // Run getUser() and getSession() in parallel since both hit the Supabase
  // auth endpoint and neither depends on the other's result.
  const [
    {
      data: { user },
    },
    {
      data: { session },
    },
  ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);
  if (!user) throw new AuthError("No active session", "NO_SESSION");
  if (!session) throw new AuthError("No active session", "NO_SESSION");
  return session.access_token;
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

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: Object.fromEntries(headers.entries()),
  });

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
