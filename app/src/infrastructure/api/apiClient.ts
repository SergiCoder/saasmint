import { AuthError } from "@/domain/errors/AuthError";
import { createClient } from "@/infrastructure/supabase/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

export async function getAuthToken(): Promise<string> {
  const supabase = await createClient();
  // Validate and refresh the JWT before reading the access token.
  // getSession() alone reads stale cookies without server-side validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AuthError("No active session", "UNAUTHENTICATED");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new AuthError("No active session", "UNAUTHENTICATED");
  return session.access_token;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });
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
    throw new Error(`API ${res.status}: ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
