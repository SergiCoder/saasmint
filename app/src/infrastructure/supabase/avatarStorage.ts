import { createClient } from "./client";
import { compressImage } from "./compressImage";

const BUCKET = "avatars";

async function getSupabaseUid(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function uploadAvatar(file: File): Promise<string> {
  const uid = await getSupabaseUid();
  const blob = await compressImage(file);
  const path = `${uid}/avatar.webp`;
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

export async function deleteAvatar(): Promise<void> {
  const uid = await getSupabaseUid();
  const path = `${uid}/avatar.webp`;
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
