import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/presentation/components/atoms/Button";

interface GetStartedButtonProps {
  planPriceId: string;
  children: React.ReactNode;
  highlighted?: boolean;
  context?: "personal" | "team";
}

export function GetStartedButton({
  planPriceId,
  children,
  highlighted = false,
  context,
}: GetStartedButtonProps) {
  const params = new URLSearchParams({ plan: planPriceId });
  if (context === "team") params.set("context", "team");

  return (
    <Link href={`/signup?${params.toString()}`} className="block">
      <Button
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {children}
      </Button>
    </Link>
  );
}
