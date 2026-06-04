"use server";

import { inquiryGateway } from "@/infrastructure/registry";
import {
  ACTION_CODE_INVALID_INPUT,
  ok,
  fail,
  toActionError,
  type ActionResult,
} from "@/lib/actions/ActionResult";
import { getString } from "@/lib/actions/parseFormData";
import { isMemberOf } from "@/lib/typeGuards";
import type { InquirySource } from "@/application/ports/IInquiryGateway";

const VALID_SOURCES = [
  "landing-cta",
  "contact-page",
] as const satisfies readonly InquirySource[];

const MAX_MESSAGE_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254;

function isValidSource(value: unknown): value is InquirySource {
  return isMemberOf(VALID_SOURCES, value);
}

export async function submitInquiry(
  _prevState: unknown,
  formData: FormData,
): Promise<ActionResult> {
  // Honeypot first — bots fill the hidden field; we silently 200 so they
  // can't differentiate the drop from a real submission.
  const honeypot = getString(formData, "honeypot");
  if (honeypot && honeypot.length > 0) {
    return ok();
  }

  const rawEmail = getString(formData, "email");
  const email = rawEmail?.trim().toLowerCase();
  const rawMessage = getString(formData, "message");
  const message = rawMessage?.trim();
  const source = getString(formData, "source");

  if (!isValidSource(source)) return fail(ACTION_CODE_INVALID_INPUT);
  if (!email || email.length > MAX_EMAIL_LENGTH) return fail("email_required");
  if (source === "contact-page" && (!message || message.length === 0)) {
    return fail("message_required");
  }
  if (message && message.length > MAX_MESSAGE_LENGTH) {
    return fail("message_too_long");
  }

  try {
    await inquiryGateway.submit({ email, message, source });
  } catch (err) {
    console.error("submitInquiry failed", err);
    return toActionError(err);
  }

  return ok();
}
