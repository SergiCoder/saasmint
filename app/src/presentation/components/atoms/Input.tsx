import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:ring-2 focus:ring-offset-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "focus:border-primary-500 focus:ring-primary-500 border-gray-300"
        } ${className}`}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
