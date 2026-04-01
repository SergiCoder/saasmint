"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function NavLink({ href, children, className = "" }: NavLinkProps) {
  const pathname = usePathname();
  const isHash = href === "#" || href.startsWith("#");
  const isActive =
    !isHash && (pathname === href || pathname.startsWith(`${href}/`));

  const linkClassName = `text-sm font-medium transition-colors ${
    isActive ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
  } ${className}`;

  if (isHash) {
    return (
      <a href={href} className={linkClassName}>
        {children}
      </a>
    );
  }

  const hashIndex = href.indexOf("#");
  const linkHref =
    hashIndex >= 0
      ? {
          pathname: href.slice(0, hashIndex) || "/",
          hash: href.slice(hashIndex),
        }
      : href;

  return (
    <Link
      href={linkHref}
      className={linkClassName}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
