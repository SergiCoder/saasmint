import { NavBar, type NavBarLink } from "../organisms/NavBar";
import { Footer, type FooterSection } from "../organisms/Footer";

export interface MarketingLayoutProps {
  appName: string;
  navLinks: NavBarLink[];
  navActions?: React.ReactNode;
  footerSections: FooterSection[];
  copyright: string;
  children: React.ReactNode;
}

export function MarketingLayout({
  appName,
  navLinks,
  navActions,
  footerSections,
  copyright,
  children,
}: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar appName={appName} links={navLinks} actions={navActions} />
      <main className="flex-1">{children}</main>
      <Footer
        appName={appName}
        sections={footerSections}
        copyright={copyright}
      />
    </div>
  );
}
