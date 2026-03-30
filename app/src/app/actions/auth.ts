"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";

async function authAction(
  formData: FormData,
  method: "signInWithPassword" | "signUp",
  redirectTo: string,
) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth[method]({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(redirectTo);
}

export async function signIn(_prevState: unknown, formData: FormData) {
  return authAction(formData, "signInWithPassword", "/dashboard");
}

export async function signUp(_prevState: unknown, formData: FormData) {
  return authAction(formData, "signUp", "/login");
}

export async function signOut() {
  await new SignOut(authGateway).execute();
  redirect("/login");
}
