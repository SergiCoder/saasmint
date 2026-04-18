"use client";

import { useEffect } from "react";
import { ErrorView } from "@/presentation/components/organisms/ErrorView";
import { Button } from "@/presentation/components/atoms/Button";
import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Catches errors thrown in the root layout, before next-intl's provider is
// available. Strings are hardcoded in English because there is no translation
// context to fall back on at this level.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[global] root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorView
          title="Something went wrong"
          description="We hit an unexpected error. Please try again in a moment."
          homeLabel="Back to home"
          homeHref="/"
          errorIdLabel="Error ID"
          errorId={error.digest}
          retrySlot={
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
          }
        />
      </body>
    </html>
  );
}
