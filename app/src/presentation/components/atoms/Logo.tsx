export interface LogoProps {
  appName: string;
  className?: string;
}

export function Logo({ appName, className = "" }: LogoProps) {
  return (
    <span
      className={`text-xl font-bold tracking-tight text-primary-600 ${className}`}
    >
      {appName}
    </span>
  );
}
