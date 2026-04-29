import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { referenceGateway, userGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { getMyOrgRole } from "../_data/getMyOrgRole";
import { getSubscriptions } from "../_data/getSubscriptions";
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

  // Independent calls run fully in parallel; only `getSubscriptions` chains
  // off the user fetch so it can pass `user.preferredCurrency` and share
  // the (app) layout's React.cache key for the subscription roundtrip.
  // `getCurrentUser` itself is React-cached (the layout requested it in
  // parallel) so the chained subscription call settles in one RTT total.
  const userPromise = getCurrentUser();
  const [t, user, phonePrefixes, myOrgRole, subscriptions] = await Promise.all([
    getTranslations("profile"),
    userGateway.getProfile(),
    referenceGateway.getPhonePrefixes(),
    getMyOrgRole(),
    userPromise.then((u) => getSubscriptions(u.preferredCurrency)),
  ]);

  const deleteRestriction: "owner" | undefined =
    myOrgRole === "owner" ? "owner" : undefined;

  // Stripe locks a customer's currency at first purchase. Until the backend
  // exposes `has_stripe_customer`, fall back to "user has any active sub"
  // (personal or team) as the proxy for "Stripe customer exists" — false
  // negatives only occur for users who fully cancelled (rare; they'll see
  // the note again if they resubscribe).
  const currencyLocked = subscriptions.length > 0;

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
