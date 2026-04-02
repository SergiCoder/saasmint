import { NavBar, type NavBarLink, type NavBarUser } from "../organisms/NavBar";
import type { UserMenuItem } from "../molecules/UserMenu";

export interface AppLayoutProps {
  appName: string;
  navLinks: NavBarLink[];
  user: NavBarUser;
  navActions?: React.ReactNode;
  userMenuItems?: UserMenuItem[];
  userMenuSignOut?: React.ReactNode;
  toggleNavLabel: string;
  children: React.ReactNode;
}

export function AppLayout({
  appName,
  navLinks,
  user,
  navActions,
  userMenuItems,
  userMenuSignOut,
  toggleNavLabel,
  children,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar
        appName={appName}
        links={navLinks}
        user={user}
        actions={navActions}
        userMenuItems={userMenuItems}
        userMenuSignOut={userMenuSignOut}
        toggleNavLabel={toggleNavLabel}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
