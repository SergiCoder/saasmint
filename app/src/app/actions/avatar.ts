"use server";

import { userGateway } from "@/infrastructure/registry";
import {
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";

const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Inspects the leading bytes of an uploaded image to confirm it actually is
 * the format its `Content-Type` advertises. `File.type` arrives over
 * multipart/form-data and is fully client-controlled, so it can't be trusted
 * as a content gate on its own — magic-byte sniffing is the second layer
 * before forwarding the file to Django.
 */
async function detectImageMime(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.length < 12) return null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function uploadAvatar(
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string }>> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("no_file");
  if (!ALLOWED_AVATAR_MIME.has(file.type)) return fail("unsupported_image");
  if (file.size > MAX_AVATAR_BYTES) return fail("image_too_large");
  const detected = await detectImageMime(file);
  if (!detected || !ALLOWED_AVATAR_MIME.has(detected)) {
    return fail("unsupported_image");
  }

  try {
    const { avatarUrl } = await userGateway.uploadAvatar(formData);
    return ok({ avatarUrl });
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteAvatar(): Promise<ActionResult> {
  try {
    await userGateway.deleteAvatar();
    return ok();
  } catch (err) {
    return toActionError(err);
  }
}
