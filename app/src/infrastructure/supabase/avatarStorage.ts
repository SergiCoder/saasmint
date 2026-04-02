import { createClient } from "./client";
import { compressImage } from "./compressImage";

const BUCKET = "avatars";

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<string> {
  const blob = await compressImage(file);
  const path = `${userId}/avatar.webp`;
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/webp", upsert: true });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Append timestamp to bust browser cache after re-upload
  return `${publicUrl}?t=${Date.now()}`;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const path = `${userId}/avatar.webp`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
