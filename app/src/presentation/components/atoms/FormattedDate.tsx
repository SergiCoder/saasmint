"use client";

import { useSyncExternalStore } from "react";

export interface FormattedDateProps {
  iso: string;
  locale?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
}

// useSyncExternalStore with a no-op subscription is the React-recommended way
// to read a client-only value without triggering a setState-in-effect lint
// warning. The "snapshot" returns true once on the client, false on the server.
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Formats an ISO date string with `Intl.DateTimeFormat`.
 *
 * If `locale` is provided (e.g. the app's next-intl locale), it is used
 * directly. Otherwise the browser's default locale is used.
 *
 * Renders a deterministic ISO fallback (`YYYY-MM-DD`) on the server and during
 * the first client render to avoid hydration mismatches, then upgrades to a
 * locale-aware format once mounted on the client.
 */
export function FormattedDate({
  iso,
  locale,
  dateStyle = "medium",
}: FormattedDateProps) {
  const fallback = iso.slice(0, 10);
  const isClient = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  let display = fallback;
  if (isClient) {
    const date = new Date(iso);
    display = Number.isNaN(date.getTime())
      ? fallback
      : new Intl.DateTimeFormat(locale, { dateStyle }).format(date);
  }

  return <span suppressHydrationWarning>{display}</span>;
}
