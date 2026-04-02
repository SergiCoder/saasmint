import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetPhonePrefixes } from "@/application/use-cases/reference/GetPhonePrefixes";
import { GetPronouns } from "@/application/use-cases/reference/GetPronouns";
import { GetUserProfile } from "@/application/use-cases/user/GetUserProfile";
import { referenceGateway, userGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../_data/getCurrentUser";
import { DeleteAccountDialog } from "./_components/DeleteAccountDialog";
import { SettingsForm } from "./_components/SettingsForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const [t, currentUser] = await Promise.all([
    getTranslations("settings"),
    getCurrentUser(),
  ]);
  const [user, phonePrefixes, pronounSuggestions] = await Promise.all([
    new GetUserProfile(userGateway).execute(currentUser.id),
    new GetPhonePrefixes(referenceGateway).execute(),
    new GetPronouns(referenceGateway).execute(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("profile")}
        </h2>
        <SettingsForm
          user={user}
          phonePrefixes={phonePrefixes}
          pronounSuggestions={pronounSuggestions}
        />
      </section>
      <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-red-600">
          {t("danger")}
        </h2>
        <p className="text-sm text-gray-600">{t("deleteConfirm")}</p>
        <div className="mt-4">
          <DeleteAccountDialog userEmail={user.email} />
        </div>
      </section>
    </div>
  );
}
