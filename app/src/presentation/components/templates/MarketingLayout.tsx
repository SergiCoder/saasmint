import { NavBar, type NavBarLink, type NavBarUser } from "../organisms/NavBar";
import { Footer, type FooterSection } from "../organisms/Footer";
import type { UserMenuItem } from "../molecules/UserMenu";

export interface MarketingLayoutProps {
  appName: string;
  navLinks: NavBarLink[];
  navUser?: NavBarUser | null;
  navActions?: React.ReactNode;
  userMenuItems?: UserMenuItem[];
  userMenuSignOut?: React.ReactNode;
  toggleNavLabel: string;
  footerSections: FooterSection[];
  copyright: string;
  children: React.ReactNode;
}

export function MarketingLayout({
  appName,
  navLinks,
  navUser,
  navActions,
  userMenuItems,
  userMenuSignOut,
  toggleNavLabel,
  footerSections,
  copyright,
  children,
}: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <NavBar
        appName={appName}
        links={navLinks}
        user={navUser}
        actions={navActions}
        userMenuItems={userMenuItems}
        userMenuSignOut={userMenuSignOut}
        toggleNavLabel={toggleNavLabel}
      />
      <main className="mt-(--navbar-height) flex-1">{children}</main>
      <Footer
        appName={appName}
        sections={footerSections}
        copyright={copyright}
      />
    </div>
  );
}
