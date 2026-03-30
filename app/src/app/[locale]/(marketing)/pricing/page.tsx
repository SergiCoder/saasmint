import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PricingTable } from "@/presentation/components/organisms/PricingTable";

export const metadata: Metadata = {
  title: "Pricing",
};

// TODO: Replace with ListPlans use-case once a public (unauthenticated) plan
// endpoint is available. Currently planGateway requires an auth token.
const PLANS = [
  {
    name: "Starter",
    price: "$0",
    interval: "month",
    features: [
      "1 project",
      "Up to 1 000 requests/mo",
      "Community support",
      "Basic analytics",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    interval: "month",
    features: [
      "Unlimited projects",
      "Up to 100 000 requests/mo",
      "Priority support",
      "Advanced analytics",
      "Custom domains",
    ],
    highlighted: true,
    highlightLabel: "Most popular",
  },
  {
    name: "Enterprise",
    price: "$99",
    interval: "month",
    features: [
      "Unlimited everything",
      "Dedicated support",
      "SSO & SAML",
      "SLA guarantee",
      "Audit logs",
      "Custom integrations",
    ],
    highlighted: false,
  },
];

export default async function PricingPage() {
  const t = await getTranslations("nav");

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
        {t("getStarted")}
      </Link>
    ),
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          {t("pricing")}
        </h1>
      </div>
      <div className="mt-16">
        <PricingTable plans={plans} />
      </div>
    </section>
  );
}
