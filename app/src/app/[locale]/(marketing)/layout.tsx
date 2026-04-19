import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { MarketingLayout } from "@/presentation/components/templates/MarketingLayout";
import { getOptionalUser } from "./_data/getOptionalUser";
import { SignOutButton } from "../_components/SignOutButton";

const primaryLinkClass =
  "bg-primary-600 hover:bg-primary-700 focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

interface MarketingLayoutRouteProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function MarketingLayoutRoute({
  children,
  params,
}: MarketingLayoutRouteProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tCommon, tFooter, user] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("footer"),
    getOptionalUser(),
  ]);

  const navLinks = [
    { href: "/", label: t("home") },
    { href: "/pricing", label: t("pricing") },
    { href: "/blog", label: t("blog") },
    { href: "/contact", label: t("contactUs") },
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
      <Link href="/pricing" className={primaryLinkClass}>
        {t("getStarted")}
      </Link>
    </>
  );

  const userMenuItems = user
    ? [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/profile", label: t("profile") },
        { href: "/subscription", label: t("subscription") },
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
