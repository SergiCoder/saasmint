import { NavBar, type NavBarLink, type NavBarUser } from "../organisms/NavBar";

export interface AppLayoutProps {
  appName: string;
  navLinks: NavBarLink[];
  user: NavBarUser;
  navActions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({
  appName,
  navLinks,
  user,
  navActions,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        appName={appName}
        links={navLinks}
        user={user}
        actions={navActions}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
