"use client";

import { RouteErrorBoundary } from "@/presentation/components/organisms/RouteErrorBoundary";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublicError(props: ErrorPageProps) {
  return <RouteErrorBoundary {...props} homeHref="/" tag="public" />;
}
