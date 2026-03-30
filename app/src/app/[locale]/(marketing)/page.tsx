import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Badge } from "@/presentation/components/atoms/Badge";
import { Button } from "@/presentation/components/atoms/Button";

export const metadata: Metadata = {
  title: "Meridian",
};

export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <Badge variant="info">{t("badge")}</Badge>
      <h1 className="mt-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
        {t("headline")}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
        {t("subheadline")}
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link href="/signup">
          <Button size="lg">{t("cta")}</Button>
        </Link>
        <Link href="#demo">
          <Button variant="secondary" size="lg">
            {t("ctaSecondary")}
          </Button>
        </Link>
      </div>
    </section>
  );
}
