import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetPhonePrefixes } from "@/application/use-cases/reference/GetPhonePrefixes";
import { GetUserProfile } from "@/application/use-cases/user/GetUserProfile";
import { referenceGateway, userGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { ChangePasswordForm } from "./_components/ChangePasswordForm";
import { DangerZone } from "./_components/DangerZone";
import { ProfileForm } from "./_components/ProfileForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

export default async function ProfilePage() {
  const [t, currentUser] = await Promise.all([
    getTranslations("profile"),
    getCurrentUser(),
  ]);
  const [user, phonePrefixes] = await Promise.all([
    new GetUserProfile(userGateway).execute(currentUser.id),
    new GetPhonePrefixes(referenceGateway).execute(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <ProfileForm user={user} phonePrefixes={phonePrefixes} />
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("changePassword")}
        </h2>
        <ChangePasswordForm />
      </section>
      <DangerZone userEmail={user.email} />
    </div>
  );
}
