import type { ComponentProps } from "react";
import { Link } from "@/lib/i18n/navigation";
import {
  BUTTON_BASE_CLASS,
  BUTTON_SIZE_CLASSES,
  BUTTON_VARIANT_CLASSES,
} from "@/lib/styles";

const LINK_BUTTON_VARIANTS = ["primary", "secondary"] as const;
type LinkButtonVariant = (typeof LINK_BUTTON_VARIANTS)[number];

type LocaleLinkProps = ComponentProps<typeof Link>;

export interface LinkButtonProps extends Omit<LocaleLinkProps, "className"> {
  variant?: LinkButtonVariant;
  size?: keyof typeof BUTTON_SIZE_CLASSES;
  fullWidth?: boolean;
  className?: string;
}

/**
 * Anchor styled like `Button`. Use for navigation that should look like a
 * button (e.g. "Get started", "Continue checkout") without violating the
 * convention of reserving `<button>` for actions. Restricted to the
 * `primary` / `secondary` variants — `ghost` / `danger` belong on real
 * `<button>` elements.
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
      className={`${BUTTON_BASE_CLASS} ${BUTTON_VARIANT_CLASSES[variant]} ${BUTTON_SIZE_CLASSES[size]} ${widthClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Link>
  );
}
