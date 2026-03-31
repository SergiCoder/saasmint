"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavLink({ href, children, className = "" }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors ${
        isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
      } ${className}`}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
