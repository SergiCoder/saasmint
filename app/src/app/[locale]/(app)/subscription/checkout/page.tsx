import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { subscriptionGateway } from "@/infrastructure/registry";
import { getCurrentUser } from "../../_data/getCurrentUser";
import { APP_ORIGIN, assertTrustedRedirect } from "../_data/trustedRedirect";

interface CheckoutPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

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
    // Use a short, non-reflective error code the subscription page maps to
    // a translated message — prevents an attacker-controlled ?error=... URL
    // from displaying arbitrary text inside the authenticated app.
    redirect(`/subscription?error=checkout_failed`);
  }

  if (!url) {
    redirect("/subscription");
  }

  redirect(url);
}
