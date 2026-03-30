"use server";

import { redirect } from "next/navigation";
import { StartCheckout } from "@/application/use-cases/billing/StartCheckout";
import { OpenBillingPortal } from "@/application/use-cases/billing/OpenBillingPortal";
import { subscriptionGateway } from "@/infrastructure/registry";

export async function startCheckout(formData: FormData) {
  const planPriceId = formData.get("planPriceId") as string;
  const orgId = formData.get("orgId") as string | null;

  const { url } = await new StartCheckout(subscriptionGateway).execute({
    planPriceId,
    ...(orgId && { orgId }),
  });

  redirect(url);
}

export async function openBillingPortal(formData: FormData) {
  const orgId = formData.get("orgId") as string | null;

  const { url } = await new OpenBillingPortal(subscriptionGateway).execute({
    ...(orgId && { orgId }),
  });

  redirect(url);
}
