"use server";

import { redirect } from "next/navigation";
import { AcceptInvitation } from "@/application/use-cases/invitation/AcceptInvitation";
import { DeclineInvitation } from "@/application/use-cases/invitation/DeclineInvitation";
import { invitationGateway } from "@/infrastructure/registry";
import { setAuthCookies } from "@/infrastructure/auth/cookies";

export async function acceptInvitation(
  _prev: unknown,
  formData: FormData,
): Promise<{ error: string } | void> {
  const token = formData.get("token");
  const fullName = formData.get("fullName");
  const password = formData.get("password");

  if (
    typeof token !== "string" ||
    typeof fullName !== "string" ||
    typeof password !== "string"
  ) {
    return { error: "Missing required fields" };
  }

  try {
    const { accessToken, refreshToken } = await new AcceptInvitation(
      invitationGateway,
    ).execute(token, { fullName, password });
    await setAuthCookies(accessToken, refreshToken);
  } catch (err) {
    console.error("Failed to accept invitation", err);
    return { error: "Failed to accept invitation" };
  }
  redirect("/dashboard");
}

export async function declineInvitation(formData: FormData) {
  const token = formData.get("token");

  if (typeof token !== "string") {
    return;
  }

  try {
    await new DeclineInvitation(invitationGateway).execute(token);
  } catch (err) {
    console.error("Failed to decline invitation", err);
    return;
  }
  redirect("/dashboard");
}
