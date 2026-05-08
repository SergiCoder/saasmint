import Link from "next/link";
import { SECONDARY_LINK_CLASS } from "@/lib/styles";

// Fallback for requests that never entered a `[locale]` segment. The root
// layout owns <html>/<body>; strings are hardcoded in English because
// next-intl's request context is not available here.

export default function RootNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-gray-900">
          Page not found
        </h1>
        <p className="mb-8 text-sm text-gray-600">
          We couldn&apos;t find the page you were looking for.
        </p>
        <Link href="/" className={SECONDARY_LINK_CLASS}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
