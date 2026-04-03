import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingLayout } from "@/presentation/components/templates/MarketingLayout";
import { getOptionalUser } from "./_data/getOptionalUser";
import { SignOutButton } from "../_components/SignOutButton";

const primaryLinkClass =
  "bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

interface MarketingLayoutRouteProps {
  children: React.ReactNode;
}

export default async function MarketingLayoutRoute({
  children,
}: MarketingLayoutRouteProps) {
  const [t, tCommon, tFooter, user] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("footer"),
    getOptionalUser(),
  ]);

  const navLinks = [
    { href: "/#features", label: t("features") },
    { href: "/pricing", label: t("pricing") },
    { href: "/contact", label: t("contactUs") },
    { href: "/blog", label: t("blog") },
  ];

  const footerSections = [
    {
      title: tFooter("legal"),
      links: [
        { href: "/privacy", label: tFooter("privacy") },
        { href: "/terms", label: tFooter("terms") },
        { href: "/cookies", label: tFooter("cookies") },
        { href: "/about", label: tFooter("aboutUs") },
      ],
    },
  ];

  const navUser = user
    ? {
        fullName: user.fullName ?? user.email,
        pronouns: user.pronouns,
        avatarUrl: user.avatarUrl,
      }
    : undefined;

  const navActions = user ? undefined : (
    <>
      <Link
        href="/login"
        className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
      >
        {t("signIn")}
      </Link>
      <Link href="/signup" className={primaryLinkClass}>
        {t("getStarted")}
      </Link>
    </>
  );

  const userMenuItems = user
    ? [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/settings", label: t("profile") },
        { href: "/billing", label: t("billing") },
      ]
    : undefined;

  return (
    <MarketingLayout
      appName="SaaSmint"
      navLinks={navLinks}
      navUser={navUser}
      navActions={navActions}
      userMenuItems={userMenuItems}
      userMenuSignOut={
        user ? <SignOutButton label={t("signOut")} /> : undefined
      }
      toggleNavLabel={tCommon("toggleNav")}
      footerSections={footerSections}
      copyright={tFooter("copyright")}
    >
      {children}
    </MarketingLayout>
  );
}
