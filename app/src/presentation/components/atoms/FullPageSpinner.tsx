import { Spinner } from "./Spinner";

export function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <Spinner size="lg" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
