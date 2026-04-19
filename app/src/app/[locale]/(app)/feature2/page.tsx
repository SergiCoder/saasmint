import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feature2" });
  return { title: t("title") };
}

export default async function Feature2Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("feature2");

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-gray-600">{t("description")}</p>
      </div>
    </div>
  );
}
