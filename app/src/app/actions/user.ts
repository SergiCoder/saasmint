"use server";

import { revalidatePath } from "next/cache";
import { GetCurrentUser } from "@/application/use-cases/auth/GetCurrentUser";
import { UpdateUserProfile } from "@/application/use-cases/user/UpdateUserProfile";
import { authGateway, userGateway } from "@/infrastructure/registry";

export async function updateProfile(_prevState: unknown, formData: FormData) {
  const user = await new GetCurrentUser(authGateway).execute();

  const fullName = formData.get("fullName") as string | null;
  const preferredLocale = formData.get("preferredLocale") as string | null;
  const preferredCurrency = formData.get("preferredCurrency") as string | null;

  try {
    await new UpdateUserProfile(userGateway).execute(user.id, {
      fullName: fullName || null,
      ...(preferredLocale && { preferredLocale }),
      ...(preferredCurrency && { preferredCurrency }),
    });
  } catch {
    return { error: "Failed to update profile" };
  }

  revalidatePath("/settings");
  return { success: true };
}
