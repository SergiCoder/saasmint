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
  /**
   * Set on above-fold avatars (e.g. the navbar user avatar) so Next.js
   * preloads the image and it counts as an LCP candidate. Defaults to
   * `false` — most avatars are below the fold.
   */
  priority?: boolean;
}

export function Avatar({
  src,
  alt,
  size = "md",
  className = "",
  priority = false,
}: AvatarProps) {
  const initials = alt
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (src) {
    const px = pixelSizes[size];
    return (
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        priority={priority}
        sizes={`${px}px`}
        className={`inline-block rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <span
      className={`bg-primary-100 text-primary-700 inline-flex items-center justify-center rounded-full font-medium ${sizes[size]} ${className}`}
      aria-label={alt}
    >
      {initials}
    </span>
  );
}
