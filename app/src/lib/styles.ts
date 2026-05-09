/**
 * Tailwind class string for an anchor styled like a `secondary` Button.
 *
 * Locale-free fallback pages (`global-error.tsx`, `not-found.tsx`) cannot
 * import the locale-aware `LinkButton` atom, so this constant is the shared
 * source of truth for the secondary-link visual.
 */
export const SECONDARY_LINK_CLASS =
  "focus-visible:ring-primary-500 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Tailwind class string for a low-emphasis "ghost" trigger that renders as
 * subtle gray text with a hover underline. Used on destructive-flow openers
 * (DangerZone delete, CancelRenewalButton) where a full secondary button
 * would be too loud relative to the primary save/keep action next to it.
 */
export const GHOST_UNDERLINE_BUTTON_CLASS =
  "cursor-pointer text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400";

/**
 * Shared base class for `Button` and `LinkButton` so the visual chrome
 * (layout, font, focus ring, transition) lives in one place. Variant-specific
 * classes are concatenated on top by each consumer; `Button` additionally
 * appends `disabled:pointer-events-none disabled:opacity-50` because anchors
 * can't be disabled at the HTML level.
 */
export const BUTTON_BASE_CLASS =
  "inline-flex cursor-pointer items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";
