"use client";

import { useState, useTransition } from "react";
import { resendVerificationEmail } from "@/app/actions/auth";
import { useRecaptcha } from "@/lib/recaptcha/useRecaptcha";
import { useActionErrorMessage } from "./useActionErrorMessage";

export type ResendVerificationStatus = "idle" | "sent" | "error";

export interface UseResendVerificationResult {
  pending: boolean;
  status: ResendVerificationStatus;
  errorMessage: string | null;
  submit: (email: string) => void;
}

export function useResendVerification(): UseResendVerificationResult {
  const translateError = useActionErrorMessage();
  const executeRecaptcha = useRecaptcha();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ResendVerificationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function submit(email: string) {
    setStatus("idle");
    setErrorMessage(null);
    startTransition(async () => {
      const token = await executeRecaptcha("resend_verification");
      const result = await resendVerificationEmail(email, token ?? undefined);
      if (result.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(translateError(result));
      }
    });
  }

  return { pending, status, errorMessage, submit };
}
