import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PHONE_PREFIXES } from "@/domain/data/phonePrefixes";
import { CARD_CLASS } from "@/lib/styles";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { getMyOrgRole } from "../../_data/getMyOrgRole";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";
import { DangerZone } from "./_components/DangerZone";
import { ProfileForm } from "./_components/ProfileForm";

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

  const [t, user, myOrgRole] = await Promise.all([
    getTranslations("profile"),
    getCurrentUser(),
    getMyOrgRole(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <section className={CARD_CLASS}>
        <ProfileForm user={user} phonePrefixes={PHONE_PREFIXES} />
      </section>
      <section className={CARD_CLASS}>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("changePassword")}
        </h2>
        <ChangePasswordForm />
      </section>
      <DangerZone
        userEmail={user.email}
        deleteRestricted={myOrgRole === "owner"}
      />
    </div>
  );
}
