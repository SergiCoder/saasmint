import Image from "next/image";

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

const pixelSizes = { sm: 32, md: 40, lg: 48 } as const;

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const initials = alt
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={pixelSizes[size]}
        height={pixelSizes[size]}
        className={`inline-block rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-primary-100 font-medium text-primary-700 ${sizes[size]} ${className}`}
      aria-label={alt}
    >
      {initials}
    </span>
  );
}
