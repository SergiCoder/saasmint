"use client";

import { useState } from "react";
import { Logo } from "../atoms/Logo";
import { Avatar } from "../atoms/Avatar";
import { NavLink } from "../molecules/NavLink";

export interface NavBarLink {
  href: string;
  label: string;
}

export interface NavBarUser {
  fullName: string;
  avatarUrl?: string | null;
}

export interface NavBarProps {
  appName: string;
  links: NavBarLink[];
  user?: NavBarUser | null;
  actions?: React.ReactNode;
  className?: string;
}

export function NavBar({
  appName,
  links,
  user,
  actions,
  className = "",
}: NavBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className={`border-b border-gray-200 bg-white ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo appName={appName} />
            <div className="hidden items-center gap-6 md:flex">
              {links.map((link) => (
                <NavLink key={link.href} href={link.href}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {actions}
            {user && (
              <Avatar src={user.avatarUrl} alt={user.fullName} size="sm" />
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 md:hidden"
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
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
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 md:hidden">
          <div className="space-y-1 px-4 py-3">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} className="block py-2">
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
