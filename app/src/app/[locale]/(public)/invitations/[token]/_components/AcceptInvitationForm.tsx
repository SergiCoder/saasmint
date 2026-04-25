"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { FormField } from "@/presentation/components/molecules/FormField";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { PasswordRequirements } from "@/presentation/components/molecules/PasswordRequirements";
import { Button } from "@/presentation/components/atoms/Button";
import { acceptInvitation } from "@/app/actions/invitation";
import { useActionErrorMessage } from "@/lib/actions/useActionErrorMessage";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";

interface AcceptInvitationFormProps {
  token: string;
}

export function AcceptInvitationForm({ token }: AcceptInvitationFormProps) {
  const t = useTranslations("invitation");
  const translateError = useActionErrorMessage();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(acceptInvitation, null);
  // One-shot guard: the `state.ok` flag persists across renders until unmount,
  // so we need to ensure `router.push` fires exactly once — not on every
  // subsequent render that happens before the navigation completes.
  const navigated = useRef(false);

  // Navigate client-side after the server action sets auth cookies. Doing the
  // navigation from the client (rather than server-side redirect inside the
  // action) lets the Set-Cookie response commit before the new page renders,
  // which avoids Next.js's RSC-prefetch "redirect count exceeded" race when
  // the invitee was already authenticated as a different user.
  useEffect(() => {
    if (state?.ok && !navigated.current) {
      navigated.current = true;
      router.push(state.data.redirectTo);
    }
  }, [state, router]);

  return (
    <>
      {state && !state.ok && (
        <AlertBanner variant="error" className="mb-4">
          {translateError(state)}
        </AlertBanner>
      )}
      <form action={formAction} className="space-y-4 text-left">
        <input type="hidden" name="token" value={token} />
        <FormField
          label={t("fullName")}
          name="fullName"
          required
          minLength={3}
          maxLength={255}
          autoComplete="name"
        />
        <FormField
          label={t("password")}
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
        />
        <PasswordRequirements />
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          className="w-full cursor-pointer"
        >
          {t("accept")}
        </Button>
      </form>
    </>
  );
}
