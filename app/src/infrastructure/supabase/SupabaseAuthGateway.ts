import type { IAuthGateway } from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";
import { AuthError } from "@/domain/errors/AuthError";
import { apiFetch } from "@/infrastructure/api/apiClient";
import { createClient } from "./server";

export class SupabaseAuthGateway implements IAuthGateway {
  async getCurrentUser(): Promise<User> {
    return apiFetch<User>("/account/");
  }

  async signOut(): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthError(error.message, "SIGN_OUT_FAILED");
  }
}
