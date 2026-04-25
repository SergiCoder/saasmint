import { Link } from "@/lib/i18n/navigation";

export interface ErrorViewProps {
  title: string;
  description: string;
  homeLabel: string;
  homeHref: string;
  errorIdLabel?: string;
  errorId?: string;
  /** Optional retry button slot (e.g. <Button onClick={reset}>Retry</Button>). */
  retrySlot?: React.ReactNode;
}

export function ErrorView({
  title,
  description,
  homeLabel,
  homeHref,
  errorIdLabel,
  errorId,
  retrySlot,
}: ErrorViewProps) {
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
          {title}
        </h1>
        <p className="mb-8 text-sm text-gray-600">{description}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {retrySlot}
          <Link
            href={homeHref}
            className="focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {homeLabel}
          </Link>
        </div>
        {errorId && errorIdLabel && (
          <p className="mt-8 font-mono text-xs text-gray-400">
            {errorIdLabel}: {errorId}
          </p>
        )}
      </div>
    </div>
  );
}
