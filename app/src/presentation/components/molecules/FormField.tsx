"use client";

import { Input, type InputProps } from "../atoms/Input";
import { Label } from "../atoms/Label";

export interface FormFieldProps extends InputProps {
  label: string;
  name: string;
  required?: boolean;
  errorMessage?: string;
}

export function FormField({
  label,
  name,
  required = false,
  errorMessage,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} required={required}>
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        required={required}
        error={!!errorMessage}
        aria-describedby={errorMessage ? `${name}-error` : undefined}
        aria-invalid={!!errorMessage}
        {...inputProps}
      />
      {errorMessage && (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
