"use server";

import { ApiError } from "@/domain/errors/ApiError";
import { AuthError } from "@/domain/errors/AuthError";
import { userGateway } from "@/infrastructure/registry";

const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthError) {
    return "Session expired. Please log in again.";
  }
  if (err instanceof ApiError) {
    return err.detail ?? fallback;
  }
  return fallback;
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

  try {
    const { avatarUrl } = await userGateway.uploadAvatar(formData);
    return { avatarUrl };
  } catch (err) {
    return { error: toErrorMessage(err, "Upload failed.") };
  }
}

export async function deleteAvatar(): Promise<{ error?: string }> {
  try {
    await userGateway.deleteAvatar();
    return {};
  } catch (err) {
    return { error: toErrorMessage(err, "Delete failed.") };
  }
}
