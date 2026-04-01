"use client";

import { useState } from "react";

const variants = {
  info: {
    container: "bg-blue-50 text-blue-800 border-blue-200",
    close: "text-blue-500 hover:bg-blue-100",
  },
  success: {
    container: "bg-green-50 text-green-800 border-green-200",
    close: "text-green-500 hover:bg-green-100",
  },
  warning: {
    container: "bg-yellow-50 text-yellow-800 border-yellow-200",
    close: "text-yellow-500 hover:bg-yellow-100",
  },
  error: {
    container: "bg-red-50 text-red-800 border-red-200",
    close: "text-red-500 hover:bg-red-100",
  },
} as const;

export interface AlertBannerProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  dismissible?: boolean;
  dismissLabel?: string;
  className?: string;
}

export function AlertBanner({
  variant = "info",
  children,
  dismissible = false,
  dismissLabel,
  className = "",
}: AlertBannerProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const styles = variants[variant];

  return (
    <div
      role="alert"
      className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${styles.container} ${className}`}
    >
      <div>{children}</div>
      {dismissible && (
        <button
          type="button"
          onClick={() => setVisible(false)}
          className={`ml-4 rounded p-1 transition-colors ${styles.close}`}
          aria-label={dismissLabel}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
