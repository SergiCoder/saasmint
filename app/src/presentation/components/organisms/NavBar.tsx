import { Logo } from "../atoms/Logo";
import { Avatar } from "../atoms/Avatar";
import { LocaleDropdown } from "../atoms/LocaleDropdown";
import { NavLink } from "../molecules/NavLink";
import { UserMenu, type UserMenuItem } from "../molecules/UserMenu";
import { MobileMenuToggle } from "./MobileMenuToggle";
import { getPathnameWithoutLocale } from "@/lib/pathname";

export interface NavBarLink {
  href: string;
  label: string;
}

export interface NavBarUser {
  fullName: string;
  pronouns?: string | null;
  avatarUrl?: string | null;
}

export interface NavBarProps {
  appName: string;
  links: NavBarLink[];
  user?: NavBarUser | null;
  actions?: React.ReactNode;
  userMenuItems?: UserMenuItem[];
  userMenuSignOut?: React.ReactNode;
  toggleNavLabel: string;
  className?: string;
}

function isLinkActive(href: string, pathname: string): boolean {
  if (href === "#" || href.startsWith("#")) return false;
  const target = href.indexOf("#") >= 0 ? href.slice(0, href.indexOf("#")) : href;
  if (!target) return false;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export async function NavBar({
  appName,
  links,
  user,
  actions,
  userMenuItems,
  userMenuSignOut,
  toggleNavLabel,
  className = "",
}: NavBarProps) {
  const pathname = await getPathnameWithoutLocale();

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-xl ${className}`}
    >
      <div className="flex h-(--navbar-height) items-center justify-between px-5 sm:px-8 lg:px-16">
        <Logo appName={appName} />

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.label}
              href={link.href}
              isActive={isLinkActive(link.href, pathname)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LocaleDropdown />
          {actions}
          {user && userMenuItems ? (
            <UserMenu
              user={user}
              menuItems={userMenuItems}
              signOutSlot={userMenuSignOut}
            />
          ) : (
            user && (
              <Avatar src={user.avatarUrl} alt={user.fullName} size="sm" />
            )
          )}
          <MobileMenuToggle toggleNavLabel={toggleNavLabel}>
            {links.map((link) => (
              <NavLink
                key={link.label}
                href={link.href}
                className="block py-2"
                isActive={isLinkActive(link.href, pathname)}
              >
                {link.label}
              </NavLink>
            ))}
            {user && userMenuItems && (
              <>
                <hr className="my-2 border-gray-200" />
                <div className="py-1 text-xs font-medium tracking-wide text-gray-400 uppercase">
                  {user.fullName}
                </div>
                {userMenuItems.map((item) => (
                  <NavLink
                    key={item.label}
                    href={item.href}
                    className="block py-2"
                    isActive={isLinkActive(item.href, pathname)}
                  >
                    {item.label}
                  </NavLink>
                ))}
                {userMenuSignOut && <div className="pt-1">{userMenuSignOut}</div>}
              </>
            )}
          </MobileMenuToggle>
        </div>
      </div>
    </nav>
  );
}
