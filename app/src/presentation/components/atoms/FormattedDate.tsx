export interface FormattedDateProps {
  iso: string;
  /**
   * Required. Formatting on the server with `Intl.DateTimeFormat(undefined, ...)`
   * uses Node's ICU locale, which almost never matches the browser's — that
   * mismatch would trigger a React hydration error. Callers pass the app's
   * next-intl locale explicitly to guarantee SSR and CSR produce the same output.
   */
  locale: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  /**
   * Optional IANA timezone. Defaults to "UTC" so the formatted date never
   * drifts by a day between server (typically UTC in prod) and client
   * (user's local timezone) for the same ISO instant.
   */
  timeZone?: string;
}

export function FormattedDate({
  iso,
  locale,
  dateStyle = "medium",
  timeZone = "UTC",
}: FormattedDateProps) {
  const fallback = iso.slice(0, 10);
  const date = new Date(iso);
  const display = Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(locale, { dateStyle, timeZone }).format(date);

  return <span>{display}</span>;
}
