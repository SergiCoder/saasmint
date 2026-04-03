"use client";

import { useState } from "react";
import { Logo } from "../atoms/Logo";
import { Avatar } from "../atoms/Avatar";
import { LocaleDropdown } from "../atoms/LocaleDropdown";
import { NavLink } from "../molecules/NavLink";
import { UserMenu, type UserMenuItem } from "../molecules/UserMenu";

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

export function NavBar({
  appName,
  links,
  user,
  actions,
  userMenuItems,
  userMenuSignOut,
  toggleNavLabel,
  className = "",
}: NavBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white/85 backdrop-blur-xl ${className}`}
    >
      <div className="flex h-(--navbar-height) items-center justify-between px-5 sm:px-8 lg:px-16">
        <Logo appName={appName} />

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <NavLink key={link.label} href={link.href}>
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
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 md:hidden"
            aria-expanded={mobileOpen}
            aria-label={toggleNavLabel}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white/97 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-5 py-4 sm:px-8">
            {links.map((link) => (
              <NavLink key={link.label} href={link.href} className="block py-2">
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
                  >
                    {item.label}
                  </NavLink>
                ))}
                {userMenuSignOut && (
                  <div className="pt-1">{userMenuSignOut}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
