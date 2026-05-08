"use client";

import { useState } from "react";

export interface DangerZoneProps {
  /**
   * Trigger label shown when the zone is collapsed (e.g. "Delete account",
   * "Delete organization"). Clicking it expands the destructive UI.
   */
  triggerLabel: string;
  /** Heading shown at the top of the expanded section (e.g. "Danger zone"). */
  heading: string;
  /** Optional description rendered below the heading inside the expanded section. */
  description?: string;
  /** Destructive content rendered inside the expanded section. */
  children: React.ReactNode;
}

/**
 * Collapsible "danger zone" — renders an underlined link until the user opts
 * in, then reveals a red-bordered card containing the destructive UI. Used
 * by both the profile page (account deletion) and the org page (org deletion)
 * so both surfaces share the same expand-to-reveal interaction.
 */
export function DangerZone({
  triggerLabel,
  heading,
  description,
  children,
}: DangerZoneProps) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="cursor-pointer text-sm text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <section className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-red-600">{heading}</h2>
      {description && (
        <p className="mb-4 text-sm text-gray-600">{description}</p>
      )}
      {children}
    </section>
  );
}
