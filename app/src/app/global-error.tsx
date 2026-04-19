"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/presentation/components/atoms/Button";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors thrown in the root layout, before next-intl's provider is
// available. Strings are hardcoded in English because there is no translation
// context, and the home link is a raw anchor because the locale-aware Link
// from next-intl would throw outside a LocaleProvider.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[global] root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
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
              Something went wrong
            </h1>
            <p className="mb-8 text-sm text-gray-600">
              We hit an unexpected error. Please try again in a moment.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="primary" onClick={reset}>
                Try again
              </Button>
              <Link
                href="/"
                className="focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Back to home
              </Link>
            </div>
            {error.digest && (
              <p className="mt-8 font-mono text-xs text-gray-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
