import type { User } from "@/domain/models/User";

export interface DeleteAccountResult {
  scheduledDeletionAt: string | null;
}

export interface IAuthGateway {
  getCurrentUser(): Promise<User>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<DeleteAccountResult>;
  cancelDeletion(): Promise<User>;
}
