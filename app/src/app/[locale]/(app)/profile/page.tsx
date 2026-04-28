import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { referenceGateway, userGateway } from "@/infrastructure/registry";
import { getMyOrgRole } from "../_data/getMyOrgRole";
import { getSubscription } from "../_data/getSubscription";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";
import { DangerZone } from "./_components/DangerZone";
import { ProfileForm } from "./_components/ProfileForm";

// Static data — compute once at module load, not per request.
const TIMEZONES = Intl.supportedValuesOf("timeZone");

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("title") };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, user, phonePrefixes, myOrgRole, subscription] = await Promise.all([
    getTranslations("profile"),
    userGateway.getProfile(),
    referenceGateway.getPhonePrefixes(),
    getMyOrgRole(),
    getSubscription(),
  ]);

  const deleteRestriction: "owner" | undefined =
    myOrgRole === "owner" ? "owner" : undefined;

  // Stripe locks a customer's currency at first purchase. Until the backend
  // exposes `has_stripe_customer`, fall back to "user has an active sub" as
  // the proxy for "Stripe customer exists" — false negatives only occur for
  // users who fully cancelled (rare; they'll see the note again if they
  // resubscribe).
  const currencyLocked = subscription !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <ProfileForm
          user={user}
          phonePrefixes={phonePrefixes}
          timezones={TIMEZONES}
          currencyLocked={currencyLocked}
        />
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("changePassword")}
        </h2>
        <ChangePasswordForm />
      </section>
      <DangerZone
        userEmail={user.email}
        deleteRestriction={deleteRestriction}
      />
    </div>
  );
}
