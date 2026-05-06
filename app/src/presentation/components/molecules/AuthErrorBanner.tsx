import { Link } from "@/lib/i18n/navigation";
import { AlertBanner } from "./AlertBanner";

export interface AuthErrorBannerProps {
  message: string;
  backToLoginLabel: string;
}

export function AuthErrorBanner({
  message,
  backToLoginLabel,
}: AuthErrorBannerProps) {
  return (
    <>
      <AlertBanner variant="error" className="mb-4">
        {message}
      </AlertBanner>
      <p className="text-center text-sm text-gray-600">
        <Link
          href="/login"
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          {backToLoginLabel}
        </Link>
      </p>
    </>
  );
}
