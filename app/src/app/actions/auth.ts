"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/infrastructure/supabase/server";
import { SignOut } from "@/application/use-cases/auth/SignOut";
import { authGateway } from "@/infrastructure/registry";

export async function signIn(_prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUp(_prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/login");
}

export async function signOut() {
  await new SignOut(authGateway).execute();
  redirect("/login");
}
