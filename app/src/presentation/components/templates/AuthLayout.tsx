import { Logo } from "../atoms/Logo";
import { LocaleDropdown } from "../atoms/LocaleDropdown";

export interface AuthLayoutProps {
  appName: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AuthLayout({
  appName,
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 pt-12 pb-32 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <LocaleDropdown />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center">
          <Logo appName={appName} className="text-2xl" />
          <h1 className="mt-6 text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
