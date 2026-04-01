import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingLayout } from "@/presentation/components/templates/MarketingLayout";
import { getOptionalUser } from "./_data/getOptionalUser";
import { SignOutButton } from "./_components/SignOutButton";

interface MarketingLayoutRouteProps {
  children: React.ReactNode;
}

export default async function MarketingLayoutRoute({
  children,
}: MarketingLayoutRouteProps) {
  const [t, tCommon, user] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getOptionalUser(),
  ]);

  const navLinks = [
    { href: "/#features", label: t("features") },
    { href: "/pricing", label: t("pricing") },
    { href: "/contact", label: t("contactUs") },
    { href: "/blog", label: t("blog") },
  ];

  const tFooter = await getTranslations("footer");

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
    ? { fullName: user.fullName ?? user.email, avatarUrl: user.avatarUrl }
    : undefined;

  const navActions = user ? (
    <>
      <Link
        href="/dashboard"
        className="bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {t("dashboard")}
      </Link>
      <SignOutButton label={t("signOut")} />
    </>
  ) : (
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
  );

  return (
    <MarketingLayout
      appName="SaaSmint"
      navLinks={navLinks}
      navUser={navUser}
      navActions={navActions}
      toggleNavLabel={tCommon("toggleNav")}
      footerSections={footerSections}
      copyright={tFooter("copyright")}
    >
      {children}
    </MarketingLayout>
  );
}
