import { getTranslations } from "next-intl/server";
import { AppLayout } from "@/presentation/components/templates/AppLayout";
import { SignOutButton } from "./_components/SignOutButton";
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
    { href: "/billing", label: t("billing") },
    { href: "/settings", label: t("settings") },
    { href: "/org", label: t("org") },
  ];

  return (
    <AppLayout
      appName="SaaSmint"
      navLinks={navLinks}
      user={{
        fullName: user.fullName ?? user.email,
        avatarUrl: user.avatarUrl,
      }}
      navActions={<SignOutButton label={t("signOut")} />}
      toggleNavLabel={tCommon("toggleNav")}
    >
      {children}
    </AppLayout>
  );
}
