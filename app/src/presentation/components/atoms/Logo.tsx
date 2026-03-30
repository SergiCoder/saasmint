export interface LogoProps {
  appName: string;
  className?: string;
}

export function Logo({ appName, className = "" }: LogoProps) {
  return (
    <span
      className={`text-primary-600 text-xl font-bold tracking-tight ${className}`}
    >
      {appName}
    </span>
  );
}
