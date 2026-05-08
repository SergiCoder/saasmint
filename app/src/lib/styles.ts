/**
 * Tailwind class string for an anchor styled like a `secondary` Button.
 *
 * Locale-free fallback pages (`global-error.tsx`, `not-found.tsx`) cannot
 * import the locale-aware `LinkButton` atom, so this constant is the shared
 * source of truth for the secondary-link visual.
 */
export const SECONDARY_LINK_CLASS =
  "focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";
