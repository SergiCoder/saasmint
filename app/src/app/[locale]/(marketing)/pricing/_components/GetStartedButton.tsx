import { LinkButton } from "@/presentation/components/atoms/LinkButton";

interface GetStartedButtonProps {
  /**
   * Plan price id forwarded to /signup as `?plan=`. Omit for the free tier
   * (no Stripe price exists post-v0.7.0) — the CTA links to plain /signup.
   */
  planPriceId?: string;
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
  const params = new URLSearchParams();
  if (planPriceId) params.set("plan", planPriceId);
  if (context === "team") params.set("context", "team");
  const query = params.toString();

  return (
    <LinkButton
      href={query ? `/signup?${query}` : "/signup"}
      variant={highlighted ? "primary" : "secondary"}
      fullWidth
    >
      {children}
    </LinkButton>
  );
}
