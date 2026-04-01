import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PricingTable } from "@/presentation/components/organisms/PricingTable";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pricing");
  return { title: t("pageTitle") };
}

// TODO: Replace with ListPlans use-case once a public (unauthenticated) plan
// endpoint is available. Currently planGateway requires an auth token.

export default async function PricingPage() {
  const [t, tNav] = await Promise.all([
    getTranslations("pricing"),
    getTranslations("nav"),
  ]);

  const PLANS = [
    {
      name: t("starterName"),
      price: t("starterPrice"),
      interval: t("interval"),
      features: [
        t("starterFeature1"),
        t("starterFeature2"),
        t("starterFeature3"),
        t("starterFeature4"),
      ],
      highlighted: false,
    },
    {
      name: t("proName"),
      price: t("proPrice"),
      interval: t("interval"),
      features: [
        t("proFeature1"),
        t("proFeature2"),
        t("proFeature3"),
        t("proFeature4"),
        t("proFeature5"),
      ],
      highlighted: true,
      highlightLabel: t("mostPopular"),
    },
    {
      name: t("enterpriseName"),
      price: t("enterprisePrice"),
      interval: t("interval"),
      features: [
        t("enterpriseFeature1"),
        t("enterpriseFeature2"),
        t("enterpriseFeature3"),
        t("enterpriseFeature4"),
        t("enterpriseFeature5"),
        t("enterpriseFeature6"),
      ],
      highlighted: false,
    },
  ];

  const plans = PLANS.map((plan) => ({
    ...plan,
    cta: (
      <Link
        href="/signup"
        className={`block w-full rounded-md px-4 py-2 text-center text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none ${
          plan.highlighted
            ? "bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 text-white"
            : "focus-visible:ring-primary-500 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {tNav("getStarted")}
      </Link>
    ),
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          {t("pageTitle")}
        </h1>
      </div>
      <div className="mt-16">
        <PricingTable plans={plans} />
      </div>
    </section>
  );
}
