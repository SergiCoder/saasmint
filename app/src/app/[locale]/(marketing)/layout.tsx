import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { MarketingLayout } from "@/presentation/components/templates/MarketingLayout";
import { Button } from "@/presentation/components/atoms/Button";

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
      links: [
        { href: "/pricing", label: t("pricing") },
        { href: "#features", label: t("features") },
        { href: "#docs", label: t("docs") },
      ],
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
        <Link href="/login">
          <Button size="sm">{t("getStarted")}</Button>
        </Link>
      }
      footerSections={footerSections}
      copyright={`\u00A9 ${new Date().getFullYear()} Meridian. All rights reserved.`}
    >
      {children}
    </MarketingLayout>
  );
}
