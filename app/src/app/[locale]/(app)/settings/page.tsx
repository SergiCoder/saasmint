import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { GetUserProfile } from "@/application/use-cases/user/GetUserProfile";
import { authGateway, userGateway } from "@/infrastructure/registry";
import { SettingsForm } from "./_components/SettingsForm";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  const currentUser = await new GetCurrentUser(authGateway).execute();
  const user = await new GetUserProfile(userGateway).execute(currentUser.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          {t("profile")}
        </h2>
        <SettingsForm user={user} />
      </section>
      <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-red-600">
          {t("danger")}
        </h2>
        <p className="text-sm text-gray-600">{t("deleteConfirm")}</p>
        <div className="mt-4">
          <button
            type="button"
            disabled
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white opacity-50"
          >
            {t("deleteAccount")}
          </button>
        </div>
      </section>
    </div>
  );
}
