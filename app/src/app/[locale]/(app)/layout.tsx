import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppLayout } from "@/presentation/components/templates/AppLayout";
import { redirect } from "@/lib/i18n/navigation";
import { getPathnameWithoutLocale } from "@/lib/pathname";
import { isLocale } from "@/lib/i18n/routing";
import { SignOutButton } from "../_components/SignOutButton";
import { getCurrentUser } from "./_data/getCurrentUser";
import { getSubscription } from "./_data/getSubscription";
import { getUserOrgs } from "./_data/getUserOrgs";

interface AppLayoutRouteProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AppLayoutRoute({
  children,
  params,
}: AppLayoutRouteProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tCommon, user] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getCurrentUser(),
  ]);

  // If the user has a preferred locale that differs from the current URL,
  // redirect server-side before we render. Saves a client-side flash.
  if (
    user.preferredLocale &&
    user.preferredLocale !== locale &&
    isLocale(user.preferredLocale)
  ) {
    const pathname = await getPathnameWithoutLocale();
    redirect({ href: pathname, locale: user.preferredLocale });
  }

  const [subscription, userOrgs] = await Promise.all([
    getSubscription(),
    getUserOrgs(user.id),
  ]);

  const hasOrg = subscription?.plan.context === "team" || userOrgs.length > 0;

  const navLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/feature1", label: t("feature1") },
    { href: "/feature2", label: t("feature2") },
    ...(hasOrg ? [{ href: "/org", label: t("org") }] : []),
  ];

  const userMenuItems = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/profile", label: t("profile") },
    { href: "/subscription", label: t("subscription") },
    ...(hasOrg ? [{ href: "/org", label: t("org") }] : []),
  ];

  return (
    <AppLayout
      appName="SaaSmint"
      navLinks={navLinks}
      user={{
        fullName: user.fullName ?? user.email,
        pronouns: user.pronouns,
        avatarUrl: user.avatarUrl,
      }}
      userMenuItems={userMenuItems}
      userMenuSignOut={<SignOutButton label={t("signOut")} />}
      toggleNavLabel={tCommon("toggleNav")}
    >
      {children}
    </AppLayout>
  );
}
