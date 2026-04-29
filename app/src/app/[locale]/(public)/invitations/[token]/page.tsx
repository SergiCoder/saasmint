import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  invitationGateway,
  subscriptionGateway,
} from "@/infrastructure/registry";
import { AuthError } from "@/domain/errors/AuthError";
import { findPersonalSubscription } from "@/domain/models/Subscription";
import { AlertBanner } from "@/presentation/components/molecules/AlertBanner";
import { Button } from "@/presentation/components/atoms/Button";
import { declineInvitation } from "@/app/actions/invitation";
import { AcceptInvitationForm } from "./_components/AcceptInvitationForm";

interface InvitationPageProps {
  params: Promise<{ locale: string; token: string }>;
}

export async function generateMetadata({
  params,
}: InvitationPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "invitation" });
  return {
    title: t("title"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function InvitationPage({ params }: InvitationPageProps) {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const [t, invitation, subscriptions] = await Promise.all([
    getTranslations("invitation"),
    invitationGateway.getByToken(token),
    // Anonymous visitors hit AuthError ("NO_SESSION") because apiFetch needs
    // a token; coerce that single case to an empty list. Anything else
    // (network down, schema parse failure, 5xx) should still surface to the
    // error boundary.
    subscriptionGateway.listSubscriptions().catch((err: unknown) => {
      if (err instanceof AuthError) return [];
      throw err;
    }),
  ]);

  const showConcurrentBillingNotice =
    findPersonalSubscription(subscriptions) !== null;

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">{t("title")}</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">
          {t("description", { orgName: invitation.orgName })}
        </p>

        {showConcurrentBillingNotice && (
          <AlertBanner variant="info" className="mb-4 text-left">
            {t("concurrentSubscriptionNotice")}
          </AlertBanner>
        )}

        <AcceptInvitationForm token={token} />

        <form action={declineInvitation} className="mt-3">
          <input type="hidden" name="token" value={token} />
          <Button
            type="submit"
            variant="secondary"
            className="w-full cursor-pointer"
          >
            {t("decline")}
          </Button>
        </form>
      </div>
    </div>
  );
}
