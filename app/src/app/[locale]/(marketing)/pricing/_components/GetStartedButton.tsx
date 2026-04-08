import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/presentation/components/atoms/Button";

interface GetStartedButtonProps {
  planPriceId: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export function GetStartedButton({
  planPriceId,
  children,
  highlighted = false,
}: GetStartedButtonProps) {
  return (
    <Link href={`/signup?plan=${planPriceId}`} className="block">
      <Button
        variant={highlighted ? "primary" : "secondary"}
        className="w-full"
      >
        {children}
      </Button>
    </Link>
  );
}
