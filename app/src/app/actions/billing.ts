"use server";

import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { OpenBillingPortal } from "@/application/use-cases/billing/OpenBillingPortal";
import { subscriptionGateway } from "@/infrastructure/registry";

const trustedHosts = ["checkout.stripe.com", "billing.stripe.com"];

function assertTrustedRedirect(url: string): void {
  const parsed = new URL(url);
  if (!trustedHosts.includes(parsed.hostname)) {
    throw new Error("Untrusted redirect URL");
  }
}

export async function startCheckout(formData: FormData) {
  const planPriceId = formData.get("planPriceId");
  const orgId = formData.get("orgId");

  if (typeof planPriceId !== "string") {
    return;
  }

  const { url } = await new StartCheckout(subscriptionGateway).execute({
    planPriceId,
    ...(typeof orgId === "string" && orgId ? { orgId } : {}),
  });

  assertTrustedRedirect(url);
  redirect(url);
}

export async function openBillingPortal(formData: FormData) {
  const orgId = formData.get("orgId");

  const { url } = await new OpenBillingPortal(subscriptionGateway).execute({
    ...(typeof orgId === "string" && orgId ? { orgId } : {}),
  });

  assertTrustedRedirect(url);
  redirect(url);
}
