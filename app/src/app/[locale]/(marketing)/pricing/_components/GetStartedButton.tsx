import { Link } from "@/lib/i18n/navigation";

interface GetStartedButtonProps {
  planPriceId: string;
  children: React.ReactNode;
  highlighted?: boolean;
  context?: "personal" | "team";
}

const base =
  "inline-flex w-full cursor-pointer items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none";

const variants = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-primary-500",
};

export function GetStartedButton({
  planPriceId,
  children,
  highlighted = false,
  context,
}: GetStartedButtonProps) {
  const params = new URLSearchParams({ plan: planPriceId });
  if (context === "team") params.set("context", "team");
  const variant = highlighted ? variants.primary : variants.secondary;

  return (
    <Link
      href={`/signup?${params.toString()}`}
      className={`${base} ${variant}`}
    >
      {children}
    </Link>
  );
}
