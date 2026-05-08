import type { ComponentProps } from "react";
import { Link } from "@/lib/i18n/navigation";
import { BUTTON_BASE_CLASS } from "@/lib/styles";

const variants = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-primary-500",
} as const;

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
} as const;

type LocaleLinkProps = ComponentProps<typeof Link>;

export interface LinkButtonProps extends Omit<LocaleLinkProps, "className"> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Anchor styled like `Button`. Use for navigation that should look like a
 * button (e.g. "Get started", "Continue checkout") without violating the
 * convention of reserving `<button>` for actions.
 */
export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  const widthClass = fullWidth ? "w-full" : "";
  return (
    <Link
      data-variant={variant}
      data-size={size}
      className={`${BUTTON_BASE_CLASS} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}
