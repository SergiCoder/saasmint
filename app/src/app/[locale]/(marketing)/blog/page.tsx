import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog");
  return { title: t("title") };
}

export default async function BlogPage() {
  const t = await getTranslations("blog");

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-gray-500">
        {t("comingSoon")}
      </p>
    </section>
  );
}
