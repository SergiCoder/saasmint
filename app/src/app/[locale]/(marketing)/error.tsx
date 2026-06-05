"use client";

import { RouteErrorBoundary } from "@/presentation/components/organisms/RouteErrorBoundary";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketingError(props: ErrorPageProps) {
  return <RouteErrorBoundary {...props} homeHref="/" tag="marketing" />;
}
