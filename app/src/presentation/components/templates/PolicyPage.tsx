import { getTranslations } from "next-intl/server";

export interface PolicyPageProps {
  namespace: string;
}

export async function PolicyPage({ namespace }: PolicyPageProps) {
  const t = await getTranslations(namespace);

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        {t("title")}
      </h1>
      <p className="mt-4 text-sm text-gray-400">{t("lastUpdated")}</p>
      <div className="mt-8 space-y-4 leading-relaxed text-gray-700">
        <p>{t("intro")}</p>
      </div>
    </section>
  );
}
