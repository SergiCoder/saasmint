import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("title") };
}

export default async function AboutPage() {
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
            href="https://github.com/SergiCoder/stripe-nextjs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            stripe-nextjs
          </a>{" "}
          — {t("repoFrontend")}
        </li>
        <li>
          <a
            href="https://github.com/SergiCoder/stripe-django"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 font-medium underline"
          >
            stripe-django
          </a>{" "}
          — {t("repoBackend")}
        </li>
      </ul>
    </section>
  );
}
