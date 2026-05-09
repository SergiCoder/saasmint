import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * Shared base styling for `<input>` / `<select>` / `<textarea>` controls.
 * Use directly on raw form elements that can't use the `Input` atom (e.g.
 * controlled `<select>` for phone prefixes, `<textarea>` for bios). Pair
 * with `INPUT_BORDER_DEFAULT` or `INPUT_BORDER_ERROR` for focus/error rings.
 */
export const INPUT_BASE_CLASS =
  "block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export const INPUT_BORDER_DEFAULT =
  "focus:border-primary-500 focus:ring-primary-500 border-gray-300";

export const INPUT_BORDER_ERROR =
  "border-red-300 focus:border-red-500 focus:ring-red-500";

/**
 * Pre-composed default-state input class — `INPUT_BASE_CLASS` joined with
 * `INPUT_BORDER_DEFAULT`. Import this on raw `<select>`/`<textarea>` /
 * inline `<input>` elements rather than reassembling the pair at every
 * call site, so the canonical visual contract changes in one place.
 */
export const INPUT_DEFAULT_CLASS = `${INPUT_BASE_CLASS} ${INPUT_BORDER_DEFAULT}`;

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`${INPUT_BASE_CLASS} ${
          error ? INPUT_BORDER_ERROR : INPUT_BORDER_DEFAULT
        } ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
