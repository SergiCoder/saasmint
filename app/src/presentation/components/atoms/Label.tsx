export interface LabelProps {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Label({
  htmlFor,
  required = false,
  children,
  className = "",
}: LabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 ${className}`}
    >
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}
