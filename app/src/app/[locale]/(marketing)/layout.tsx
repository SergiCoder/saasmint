import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { MarketingLayout } from "@/presentation/components/templates/MarketingLayout";

interface MarketingLayoutRouteProps {
  children: React.ReactNode;
}

export default async function MarketingLayoutRoute({
  children,
}: MarketingLayoutRouteProps) {
  const t = await getTranslations("nav");

  const navLinks = [
    { href: "/pricing", label: t("pricing") },
    { href: "#features", label: t("features") },
    { href: "#docs", label: t("docs") },
  ];

  const footerSections = [
    {
      title: "Product",
      links: navLinks,
    },
    {
      title: "Company",
      links: [
        { href: "#about", label: "About" },
        { href: "#blog", label: "Blog" },
      ],
    },
  ];

  return (
    <MarketingLayout
      appName="Meridian"
      navLinks={navLinks}
      navActions={
        <Link
          href="/login"
          className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {t("getStarted")}
        </Link>
      }
      footerSections={footerSections}
      copyright={`\u00A9 ${new Date().getFullYear()} Meridian. All rights reserved.`}
    >
      {children}
    </MarketingLayout>
  );
}
