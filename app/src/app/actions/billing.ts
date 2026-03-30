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

  let url: string;
  try {
    ({ url } = await new StartCheckout(subscriptionGateway).execute({
      planPriceId,
      ...(typeof orgId === "string" && orgId ? { orgId } : {}),
    }));
    assertTrustedRedirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("Failed to start checkout", err);
    return;
  }
  redirect(url);
}

export async function openBillingPortal(formData: FormData) {
  const orgId = formData.get("orgId");

  let url: string;
  try {
    ({ url } = await new OpenBillingPortal(subscriptionGateway).execute({
      ...(typeof orgId === "string" && orgId ? { orgId } : {}),
    }));
    assertTrustedRedirect(url);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    console.error("Failed to open billing portal", err);
    return;
  }
  redirect(url);
}
