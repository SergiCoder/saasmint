import { Link } from "@/lib/i18n/navigation";

export interface LogoProps {
  appName: string;
  href?: string;
  className?: string;
}

export function Logo({ appName, href = "/", className = "" }: LogoProps) {
  return (
    <Link
      href={href}
      className={`text-primary-600 text-xl font-bold tracking-tight ${className}`}
    >
      {appName}
    </Link>
  );
}
