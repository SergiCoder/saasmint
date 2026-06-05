export interface SectionLabelProps {
  centered?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({
  centered = false,
  children,
  className = "",
}: SectionLabelProps) {
  return (
    <p
      className={`text-primary-600 mb-3 flex items-center gap-2 text-xs font-semibold tracking-widest uppercase ${centered ? "justify-center" : ""} ${className}`}
    >
      <span className="bg-primary-600 inline-block h-0.5 w-3.5 rounded-full" />
      {children}
    </p>
  );
}
