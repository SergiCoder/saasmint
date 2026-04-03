"use server";

import { revalidatePath } from "next/cache";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { DeleteAccount } from "@/application/use-cases/auth/DeleteAccount";
import { UpdateUserProfile } from "@/application/use-cases/user/UpdateUserProfile";
import { authGateway, userGateway } from "@/infrastructure/registry";

export async function updateAvatarUrl(avatarUrl: string | null) {
  const user = await new GetCurrentUser(authGateway).execute();
  await new UpdateUserProfile(userGateway).execute(user.id, { avatarUrl });
  revalidatePath("/", "layout");
}

export async function updateProfile(_prevState: unknown, formData: FormData) {
  const user = await new GetCurrentUser(authGateway).execute();

  const fullName = formData.get("fullName");
  const avatarUrl = formData.get("avatarUrl");
  const preferredLocale = formData.get("preferredLocale");
  const preferredCurrency = formData.get("preferredCurrency");
  const phonePrefix = formData.get("phonePrefix");
  const phone = formData.get("phone");
  const timezone = formData.get("timezone");
  const jobTitle = formData.get("jobTitle");
  const pronouns = formData.get("pronouns");
  const bio = formData.get("bio");

  if (
    typeof fullName !== "string" ||
    fullName.length < 3 ||
    fullName.length > 255
  ) {
    return { error: "Full name must be between 3 and 255 characters" };
  }

  try {
    await new UpdateUserProfile(userGateway).execute(user.id, {
      fullName,
      avatarUrl: typeof avatarUrl === "string" && avatarUrl ? avatarUrl : null,
      ...(typeof preferredLocale === "string" &&
        preferredLocale && { preferredLocale }),
      ...(typeof preferredCurrency === "string" &&
        preferredCurrency && { preferredCurrency }),
      phonePrefix:
        typeof phonePrefix === "string" && phonePrefix ? phonePrefix : null,
      phone: typeof phone === "string" && phone ? phone : null,
      timezone: typeof timezone === "string" && timezone ? timezone : null,
      jobTitle: typeof jobTitle === "string" && jobTitle ? jobTitle : null,
      pronouns: typeof pronouns === "string" && pronouns ? pronouns : null,
      bio: typeof bio === "string" && bio ? bio : null,
    });
  } catch {
    return { error: "Failed to update profile" };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount(): Promise<{
  error?: string;
  success?: boolean;
}> {
  try {
    await new DeleteAccount(authGateway).execute();
  } catch {
    return { error: "Failed to delete account" };
  }
  return { success: true };
}
