const variants = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  success: "bg-green-50 text-green-800 border-green-200",
  warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  error: "bg-red-50 text-red-800 border-red-200",
} as const;

export interface AlertBannerProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export function AlertBanner({
  variant = "info",
  children,
  className = "",
}: AlertBannerProps) {
  return (
    <div
      role="alert"
      className={`rounded-md border px-4 py-3 text-sm ${variants[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
