import { Link } from "@/lib/i18n/navigation";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
}

export function NavLink({
  href,
  children,
  className = "",
  isActive = false,
}: NavLinkProps) {
  const isHash = href === "#" || href.startsWith("#");
  const active = !isHash && isActive;

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
