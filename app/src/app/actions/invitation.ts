"use server";

import { redirect } from "next/navigation";
import { invitationGateway } from "@/infrastructure/registry";
import {
  ACTION_CODE_INVALID_INPUT,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";
import { getLocale } from "@/lib/pathname";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

// Backend creates the invitee as unverified and emails a verification link
// instead of issuing tokens. We mirror the regular signup flow: redirect to
// /login with the `invited` flag so the page renders an invitation-specific
// "check your email" banner.
export async function acceptInvitation(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<never>> {
  const token = getString(formData, "token");
  const fullName = getString(formData, "fullName");
  const password = getString(formData, "password");

  if (!token || !fullName || !password) {
    return fail(ACTION_CODE_INVALID_INPUT);
  }
  if (fullName.length < 3 || fullName.length > 255) {
    return fail("full_name_invalid");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return fail("password_too_short");
  }

  try {
    await invitationGateway.acceptInvitation(token, { fullName, password });
  } catch (err) {
    console.error("Failed to accept invitation", err);
    return toActionError(err);
  }
  const locale = await getLocale();
  redirect(`/${locale}/login?invited=true`);
}

// Fire-and-forget: consumed via `<form action={fn}>` which requires
// `Promise<void>`. Errors log server-side; the redirect on success is the
// signal to the user.
export async function declineInvitation(formData: FormData): Promise<void> {
  const token = getString(formData, "token");
  if (!token) return;

  try {
    await invitationGateway.declineInvitation(token);
  } catch (err) {
    console.error("Failed to decline invitation", err);
    return;
  }
  const locale = await getLocale();
  redirect(`/${locale}/dashboard`);
}
