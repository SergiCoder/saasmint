import { NavBar, type NavBarLink, type NavBarUser } from "../organisms/NavBar";
import { Footer, type FooterSection } from "../organisms/Footer";

export interface MarketingLayoutProps {
  appName: string;
  navLinks: NavBarLink[];
  navUser?: NavBarUser | null;
  navActions?: React.ReactNode;
  toggleNavLabel?: string;
  footerSections: FooterSection[];
  copyright: string;
  children: React.ReactNode;
}

export function MarketingLayout({
  appName,
  navLinks,
  navUser,
  navActions,
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
        toggleNavLabel={toggleNavLabel}
      />
      <main className="mt-[62px] flex-1">{children}</main>
      <Footer
        appName={appName}
        sections={footerSections}
        copyright={copyright}
      />
    </div>
  );
}
