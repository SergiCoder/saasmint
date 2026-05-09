"use server";

import { authGateway, userGateway } from "@/infrastructure/registry";
import { isLocale } from "@/lib/i18n/routing";
import { revalidateLocalizedPath } from "@/lib/revalidate";
import {
  ACTION_CODE_INVALID_INPUT,
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";

function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function updateAvatarUrl(
  avatarUrl: string | null,
): Promise<ActionResult> {
  // Defence-in-depth: backend authoritatively validates avatar URLs, but this
  // action is a public RPC — clients can call it with any string. Reject
  // non-https schemes (data:, javascript:, etc.) before forwarding.
  if (avatarUrl !== null && !isAllowedAvatarUrl(avatarUrl)) {
    return fail(ACTION_CODE_INVALID_INPUT, {
      fieldErrors: { avatarUrl: "invalid" },
    });
  }
  try {
    await userGateway.updateProfile({ avatarUrl });
  } catch (err) {
    console.error("Failed to update avatar", err);
    return toActionError(err);
  }
  revalidateLocalizedPath("/", "layout");
  return ok();
}

export async function updateProfile(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  const fullName = getString(formData, "fullName");
  if (!fullName || fullName.length < 3 || fullName.length > 255) {
    return fail("full_name_invalid");
  }

  const phonePrefix = getString(formData, "phonePrefix") || null;
  const phone = getString(formData, "phone") || null;
  const hasPrefix = phonePrefix !== null;
  const hasPhone = phone !== null;

  if (hasPrefix !== hasPhone) {
    return fail(ACTION_CODE_INVALID_INPUT, {
      fieldErrors: {
        phone: hasPrefix ? "phoneNumberRequired" : "phonePrefixRequired",
      },
    });
  }

  if (phone && phone.length < 4) {
    return fail(ACTION_CODE_INVALID_INPUT, {
      fieldErrors: { phone: "phoneTooShort" },
    });
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

  // Layout scope: the (app) layout reads user fullName and avatar to render
  // the navbar. Without "layout" the navbar shows stale data after a save.
  revalidateLocalizedPath("/profile", "layout");
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
