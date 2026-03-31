import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Badge } from "@/presentation/components/atoms/Badge";
import { TrustBar } from "@/presentation/components/molecules/TrustBar";
import { DashboardMock } from "@/presentation/components/organisms/DashboardMock";
import { LogoCloud } from "@/presentation/components/organisms/LogoCloud";
import { FeaturesGrid } from "@/presentation/components/organisms/FeaturesGrid";
import { StatsSection } from "@/presentation/components/organisms/StatsSection";
import { CtaSection } from "@/presentation/components/organisms/CtaSection";

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Meridian" };
}

const TRUST_USERS = [
  { name: "JK" },
  { name: "SM" },
  { name: "RL" },
  { name: "TP" },
];

const LOGOS = [
  "Stripe",
  "Vercel",
  "Notion",
  "Linear",
  "Loom",
  "Figma",
  "Retool",
];

const CHART_BARS = [35, 55, 45, 70, 60, 80, 95, 75, 88, 65, 72, 58];

export default async function LandingPage() {
  const t = await getTranslations("landing");

  const features = [
    {
      icon: <span>⚡</span>,
      title: t("featureDeploysTitle"),
      description: t("featureDeploysDesc"),
    },
    {
      icon: <span>🧠</span>,
      title: t("featureAiTitle"),
      description: t("featureAiDesc"),
    },
    {
      icon: <span>🌐</span>,
      title: t("featureEdgeTitle"),
      description: t("featureEdgeDesc"),
    },
    {
      icon: <span>📊</span>,
      title: t("featureObsTitle"),
      description: t("featureObsDesc"),
    },
    {
      icon: <span>🔐</span>,
      title: t("featureSecTitle"),
      description: t("featureSecDesc"),
    },
    {
      icon: <span>🔌</span>,
      title: t("featureIntTitle"),
      description: t("featureIntDesc"),
    },
  ];

  const stats = [
    { value: t("statDevs"), label: t("statDevsLabel") },
    { value: t("statUptime"), label: t("statUptimeLabel") },
    { value: t("statRegions"), label: t("statRegionsLabel") },
    { value: t("statLatency"), label: t("statLatencyLabel") },
  ];

  const dashMetrics = [
    {
      title: t("dashUptime"),
      value: t("dashUptimeVal"),
      change: t("dashUptimeSub"),
    },
    {
      title: t("dashLatency"),
      value: t("dashLatencyVal"),
      change: t("dashLatencySub"),
    },
  ];

  const dashActivities = [
    {
      icon: <span>✓</span>,
      text: t("dashActivity1"),
      time: t("dashActivity1Time"),
    },
    {
      icon: <span>⚡</span>,
      text: t("dashActivity2"),
      time: t("dashActivity2Time"),
    },
    {
      icon: <span>🔍</span>,
      text: t("dashActivity3"),
      time: t("dashActivity3Time"),
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid min-h-[88vh] max-w-6xl items-center gap-16 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <Badge variant="success" className="mb-7">
            {t("badge")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {t.rich("headline", {
              accent: (chunks) => (
                <em className="text-primary-600 not-italic">{chunks}</em>
              ),
            })}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-500">
            {t("subheadline")}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-2.5">
            <Link
              href="/signup"
              className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {t("cta")}
            </Link>
            <Link
              href="#demo"
              className="focus-visible:ring-primary-500 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-base text-gray-900 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle
                  cx="7.5"
                  cy="7.5"
                  r="6.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <path d="M6 5L10 7.5L6 10V5Z" fill="currentColor" />
              </svg>
              {t("ctaSecondary")}
            </Link>
          </div>
          <TrustBar
            users={TRUST_USERS}
            text={t("trustText", { count: "12,400" })}
            className="mt-11"
          />
        </div>
        <div>
          <DashboardMock
            url={t("dashUrl")}
            metrics={dashMetrics}
            chartLabel={t("dashChart")}
            chartBars={CHART_BARS}
            activities={dashActivities}
          />
        </div>
      </section>

      {/* Logo cloud */}
      <LogoCloud label={t("logosLabel")} logos={LOGOS} />

      {/* Features */}
      <FeaturesGrid
        label={t("featuresLabel")}
        title={t("featuresTitle")}
        subtitle={t("featuresSubtitle")}
        features={features}
      />

      {/* Stats */}
      <StatsSection stats={stats} />

      {/* CTA */}
      <CtaSection
        label={t("ctaSectionLabel")}
        title={t("ctaSectionTitle")}
        subtitle={t("ctaSectionSubtitle")}
        inputPlaceholder={t("ctaSectionPlaceholder")}
        buttonText={t("ctaSectionButton")}
      />
    </>
  );
}
