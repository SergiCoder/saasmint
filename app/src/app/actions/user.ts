"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "@/domain/errors/AuthError";
import { authGateway, userGateway } from "@/infrastructure/registry";
import { isLocale } from "@/lib/i18n/routing";
import {
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";

export async function updateAvatarUrl(
  avatarUrl: string | null,
): Promise<ActionResult> {
  try {
    await authGateway.getCurrentUser();
    await userGateway.updateProfile({ avatarUrl });
  } catch (err) {
    console.error("Failed to update avatar", err);
    return toActionError(err);
  }
  revalidatePath("/", "layout");
  return ok();
}

export async function updateProfile(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await authGateway.getCurrentUser();
  } catch (err) {
    return err instanceof AuthError
      ? fail("session_expired")
      : fail("profile_load_failed");
  }

  const fullName = getString(formData, "fullName");
  if (!fullName || fullName.length < 3 || fullName.length > 255) {
    return fail("full_name_invalid");
  }

  const phonePrefix = getString(formData, "phonePrefix") || null;
  const phone = getString(formData, "phone") || null;
  const hasPrefix = phonePrefix !== null;
  const hasPhone = phone !== null;

  if (hasPrefix !== hasPhone) {
    return fail("invalid_input", {
      fieldErrors: {
        phone: hasPrefix ? "phoneNumberRequired" : "phonePrefixRequired",
      },
    });
  }

  if (phone && phone.length < 4) {
    return fail("invalid_input", { fieldErrors: { phone: "phoneTooShort" } });
  }

  const preferredLocale = getString(formData, "preferredLocale");
  const preferredCurrency = getString(formData, "preferredCurrency");
  const timezone = getString(formData, "timezone") || null;
  const jobTitle = getString(formData, "jobTitle") || null;
  const pronouns = getString(formData, "pronouns") || null;
  const bio = getString(formData, "bio") || null;

  try {
    await userGateway.updateProfile({
      fullName,
      ...(preferredLocale ? { preferredLocale } : {}),
      ...(preferredCurrency ? { preferredCurrency } : {}),
      phonePrefix,
      phone,
      timezone,
      jobTitle,
      pronouns,
      bio,
    });
  } catch (err) {
    console.error("[updateProfile]", err);
    return toActionError(err);
  }

  revalidatePath("/profile");
  return ok();
}

export async function updatePreferredLocale(locale: string): Promise<void> {
  // Validate against the supported-locale allow-list: this is a server action
  // callable by any authenticated client, so we must not forward arbitrary
  // strings to the backend / storage.
  if (!isLocale(locale)) {
    return;
  }
  try {
    await userGateway.updateProfile({ preferredLocale: locale });
  } catch {
    // Not authenticated or update failed — silently ignore
  }
}

export async function deleteAccount(): Promise<ActionResult> {
  try {
    await authGateway.deleteAccount();
    return ok();
  } catch (err) {
    console.error("Failed to delete account", err);
    return toActionError(err);
  }
}
