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

export async function uploadAvatar(
  formData: FormData,
): Promise<ActionResult<{ avatarUrl: string }>> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return fail("no_file");
  if (!ALLOWED_AVATAR_MIME.has(file.type)) return fail("unsupported_image");
  if (file.size > MAX_AVATAR_BYTES) return fail("image_too_large");

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
