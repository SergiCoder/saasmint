"use server";

import { revalidatePath } from "next/cache";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { DeleteAccount } from "@/application/use-cases/auth/DeleteAccount";
import { UpdateUserProfile } from "@/application/use-cases/user/UpdateUserProfile";
import { AuthError } from "@/domain/errors/AuthError";
import { authGateway, userGateway } from "@/infrastructure/registry";
import { routing } from "@/lib/i18n/routing";

export async function updateAvatarUrl(
  avatarUrl: string | null,
): Promise<{ error?: string }> {
  try {
    const user = await new GetCurrentUser(authGateway).execute();
    await new UpdateUserProfile(userGateway).execute(user.id, { avatarUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Session expired. Please log in again." };
    }
    return { error: "Failed to update avatar" };
  }
  revalidatePath("/", "layout");
  return {};
}

export async function updateProfile(_prevState: unknown, formData: FormData) {
  let user;
  try {
    user = await new GetCurrentUser(authGateway).execute();
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Session expired. Please log in again." };
    }
    return { error: "Failed to load profile" };
  }

  const fullName = formData.get("fullName");
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

  const hasPrefix = typeof phonePrefix === "string" && phonePrefix !== "";
  const hasPhone = typeof phone === "string" && phone !== "";

  if (hasPrefix !== hasPhone) {
    return {
      fieldErrors: {
        phone: hasPrefix ? "phoneNumberRequired" : "phonePrefixRequired",
      },
    };
  }

  if (hasPhone && (phone as string).length < 4) {
    return {
      fieldErrors: { phone: "phoneTooShort" },
    };
  }

  try {
    await new UpdateUserProfile(userGateway).execute(user.id, {
      fullName,
      ...(typeof preferredLocale === "string" &&
        preferredLocale && { preferredLocale }),
      ...(typeof preferredCurrency === "string" &&
        preferredCurrency && { preferredCurrency }),
      phonePrefix: hasPrefix ? (phonePrefix as string) : null,
      phone: hasPhone ? (phone as string) : null,
      timezone: typeof timezone === "string" && timezone ? timezone : null,
      jobTitle: typeof jobTitle === "string" && jobTitle ? jobTitle : null,
      pronouns: typeof pronouns === "string" && pronouns ? pronouns : null,
      bio: typeof bio === "string" && bio ? bio : null,
    });
  } catch (err) {
    console.error("[updateProfile]", err);
    return { error: "Failed to update profile" };
  }

  revalidatePath("/profile");
  return { success: true };
}

export async function updatePreferredLocale(locale: string): Promise<void> {
  // Validate against the supported-locale allow-list: this is a server action
  // callable by any authenticated client, so we must not forward arbitrary
  // strings to the backend / storage.
  if (!(routing.locales as readonly string[]).includes(locale)) {
    return;
  }
  try {
    const user = await new GetCurrentUser(authGateway).execute();
    await new UpdateUserProfile(userGateway).execute(user.id, {
      preferredLocale: locale,
    });
  } catch {
    // Not authenticated or update failed — silently ignore
  }
}

export async function deleteAccount(): Promise<{
  error?: string;
  success?: boolean;
  scheduledDeletionAt?: string | null;
}> {
  try {
    const result = await new DeleteAccount(authGateway).execute();
    return { success: true, scheduledDeletionAt: result.scheduledDeletionAt };
  } catch {
    return { error: "Failed to delete account" };
  }
}
