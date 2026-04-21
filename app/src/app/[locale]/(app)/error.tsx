"use client";

import { RouteErrorBoundary } from "@/presentation/components/organisms/RouteErrorBoundary";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError(props: ErrorPageProps) {
  return <RouteErrorBoundary {...props} homeHref="/dashboard" tag="app" />;
}
