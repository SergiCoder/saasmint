import { getTranslations } from "next-intl/server";
import { AppLayout } from "@/presentation/components/templates/AppLayout";
import { SignOutButton } from "../_components/SignOutButton";
import { LocaleRedirect } from "./_components/LocaleRedirect";
import { getCurrentUser } from "./_data/getCurrentUser";
import { getSubscription } from "./_data/getSubscription";
import { getUserOrgs } from "./_data/getUserOrgs";

interface AppLayoutRouteProps {
  children: React.ReactNode;
}

export default async function AppLayoutRoute({
  children,
}: AppLayoutRouteProps) {
  const [t, tCommon, user, subscription] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getCurrentUser(),
    getSubscription(),
  ]);

  const isTeamSubscription = subscription?.plan.context === "team";
  const hasOrg = isTeamSubscription
    ? true
    : await getUserOrgs(user.id).then((orgs) => orgs.length > 0);

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
    <>
      <LocaleRedirect preferredLocale={user.preferredLocale} />
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
    </>
  );
}
