import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  return { title: t("title") };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("about");

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-gray-500">{t("intro")}</p>
      <p className="mt-4 text-base leading-relaxed text-gray-600">
        {t("body")}
      </p>
      <ul className="mt-6 space-y-2 text-base leading-relaxed text-gray-600">
        <li>
          <a
            href="https://github.com/SergiCoder/SaaSmint-App"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            SaaSmint App
          </a>{" "}
          — {t("repoFrontend")}
        </li>
        <li>
          <a
            href="https://github.com/SergiCoder/SaaSmint-Core"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            SaaSmint Core
          </a>{" "}
          — {t("repoBackend")}
        </li>
      </ul>
    </section>
  );
}
