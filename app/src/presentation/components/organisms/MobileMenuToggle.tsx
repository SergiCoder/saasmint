"use client";

import { useState } from "react";

export interface MobileMenuToggleProps {
  toggleNavLabel: string;
  children: React.ReactNode;
}

export function MobileMenuToggle({
  toggleNavLabel,
  children,
}: MobileMenuToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex cursor-pointer items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 md:hidden"
        aria-expanded={open}
        aria-label={toggleNavLabel}
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute top-(--navbar-height) right-0 left-0 border-t border-gray-200 bg-white/97 backdrop-blur-xl md:hidden">
          <div className="space-y-1 px-5 py-4 sm:px-8">{children}</div>
        </div>
      )}
    </>
  );
}
