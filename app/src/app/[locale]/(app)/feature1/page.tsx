import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feature1");
  return { title: t("title") };
}

export default async function Feature1Page() {
  const t = await getTranslations("feature1");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-600">{t("description")}</p>
      </div>
    </div>
  );
}
