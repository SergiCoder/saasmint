import type { IAuthGateway } from "@/application/ports/IAuthGateway";
import type { User } from "@/domain/models/User";
import { AuthError } from "@/domain/errors/AuthError";
import { apiFetch } from "@/infrastructure/api/apiClient";
import { createClient } from "./server";

export class SupabaseAuthGateway implements IAuthGateway {
  async getCurrentUser(): Promise<User> {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new AuthError("No active session", "UNAUTHENTICATED");
    return apiFetch<User>("/account/", session.access_token);
  }

  async signOut(): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw new AuthError(error.message, "SIGN_OUT_FAILED");
  }
}
