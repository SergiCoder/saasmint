import { LinkButton } from "@/presentation/components/atoms/LinkButton";

interface TeamCheckoutButtonProps {
  planPriceId: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export function TeamCheckoutButton({
  planPriceId,
  children,
  highlighted = false,
}: TeamCheckoutButtonProps) {
  return (
    <LinkButton
      href={`/subscription/team-checkout?plan=${planPriceId}`}
      variant={highlighted ? "primary" : "secondary"}
      fullWidth
    >
      {children}
    </LinkButton>
  );
}
