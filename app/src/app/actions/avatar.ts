"use server";

import { getAuthToken } from "@/infrastructure/api/apiClient";
import { AuthError } from "@/domain/errors/AuthError";
import { env } from "@/lib/env";

const API_URL = env.NEXT_PUBLIC_API_URL;

const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Resolve the auth token, returning an error string on failure. */
async function resolveToken(
  fallbackError: string,
): Promise<{ token: string } | { error: string }> {
  try {
    return { token: await getAuthToken() };
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Session expired. Please log in again." };
    }
    return { error: fallbackError };
  }
}

/** Extract an error message from a non-ok API response. */
async function extractApiError(
  res: Response,
  fallbackError: string,
): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await res.json()) as { detail?: string };
    return data.detail ?? fallbackError;
  }
  return fallbackError;
}

export async function uploadAvatar(
  formData: FormData,
): Promise<{ avatarUrl?: string; error?: string }> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file provided." };
  }
  if (!ALLOWED_AVATAR_MIME.has(file.type)) {
    return { error: "Unsupported image type." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "Image too large." };
  }

  const auth = await resolveToken("Upload failed.");
  if ("error" in auth) return { error: auth.error };

  const res = await fetch(`${API_URL}/api/v1/account/avatar/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}` },
    body: formData,
  });

  if (!res.ok) {
    return { error: await extractApiError(res, "Upload failed.") };
  }

  const data = (await res.json()) as { avatar_url: string };
  return { avatarUrl: data.avatar_url };
}

export async function deleteAvatar(): Promise<{ error?: string }> {
  const auth = await resolveToken("Delete failed.");
  if ("error" in auth) return { error: auth.error };

  const res = await fetch(`${API_URL}/api/v1/account/avatar/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${auth.token}` },
  });

  if (!res.ok) {
    return { error: await extractApiError(res, "Delete failed.") };
  }

  return {};
}
