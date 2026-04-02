import { getTranslations } from "next-intl/server";
import { AppLayout } from "@/presentation/components/templates/AppLayout";
import { SignOutButton } from "../_components/SignOutButton";
import { getCurrentUser } from "./_data/getCurrentUser";

interface AppLayoutRouteProps {
  children: React.ReactNode;
}

export default async function AppLayoutRoute({
  children,
}: AppLayoutRouteProps) {
  const [t, tCommon, user] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getCurrentUser(),
  ]);

  const navLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/feature1", label: t("feature1") },
    { href: "/feature2", label: t("feature2") },
  ];

  const userMenuItems = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/settings", label: t("profile") },
    { href: "/billing", label: t("billing") },
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
