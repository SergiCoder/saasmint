"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

function isActiveFor(href: string, pathname: string): boolean {
  if (href === "#" || href.startsWith("#")) return false;
  const hashIdx = href.indexOf("#");
  const target = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  if (!target) return false;
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function NavLink({ href, children, className = "" }: NavLinkProps) {
  const pathname = usePathname();
  const isHash = href === "#" || href.startsWith("#");
  const active = isActiveFor(href, pathname);

  const linkClassName = `text-sm font-medium transition-colors ${
    active ? "text-primary-600" : "text-gray-600 hover:text-gray-900"
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
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
