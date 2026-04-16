import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { subscriptionGateway } from "@/infrastructure/registry";
import { friendlyError } from "@/lib/friendlyError";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { APP_ORIGIN, assertTrustedRedirect } from "../_data/trustedRedirect";

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const [, { plan }] = await Promise.all([getCurrentUser(), searchParams]);

  if (!plan) {
    redirect("/subscription");
  }

  let url: string | null = null;
  try {
    const session = await new StartCheckout(subscriptionGateway).execute({
      planPriceId: plan,
      successUrl: `${APP_ORIGIN}/subscription?status=success`,
      cancelUrl: `${APP_ORIGIN}/subscription`,
    });
    assertTrustedRedirect(session.url);
    url = session.url;
  } catch (err) {
    console.error("Failed to start checkout", err);
    const message = friendlyError(
      err,
      "Something went wrong. Please try again.",
    );
    redirect(`/subscription?error=${encodeURIComponent(message)}`);
  }

  if (!url) {
    redirect("/subscription");
  }

  redirect(url);
}
