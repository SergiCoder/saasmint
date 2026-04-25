import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContactForm } from "./_components/ContactForm";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title") };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("contact");

  return (
    <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-gray-500">
        {t("description")}
      </p>
      <div className="mt-8">
        <ContactForm
          placeholder={t("placeholder")}
          messagePlaceholder={t("messagePlaceholder")}
          submitLabel={t("submit")}
        />
      </div>
    </section>
  );
}
