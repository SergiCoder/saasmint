import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingLayout } from "@/presentation/components/templates/MarketingLayout";

interface MarketingLayoutRouteProps {
  children: React.ReactNode;
}

export default async function MarketingLayoutRoute({
  children,
}: MarketingLayoutRouteProps) {
  const t = await getTranslations("nav");

  const navLinks = [
    { href: "#features", label: t("features") },
    { href: "#stats", label: t("whyUs") },
    { href: "/pricing", label: t("pricing") },
    { href: "#", label: t("docs") },
    { href: "#", label: t("blog") },
  ];

  const tFooter = await getTranslations("footer");

  const footerSections = [
    {
      title: "Legal",
      links: [
        { href: "#", label: tFooter("privacy") },
        { href: "#", label: tFooter("terms") },
        { href: "#", label: tFooter("security") },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "#", label: tFooter("status") },
        { href: "#", label: t("docs") },
        { href: "#", label: t("blog") },
      ],
    },
  ];

  return (
    <MarketingLayout
      appName="Meridian"
      navLinks={navLinks}
      navActions={
        <>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            {t("signIn")}
          </Link>
          <Link
            href="/signup"
            className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t("getStarted")}
          </Link>
        </>
      }
      footerSections={footerSections}
      copyright={tFooter("copyright")}
    >
      {children}
    </MarketingLayout>
  );
}
