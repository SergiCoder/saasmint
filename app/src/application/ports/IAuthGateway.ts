import type { User } from "@/domain/models/User";

/**
 * Result of a successful account-deletion request.
 *
 * `scheduledDeletionAt` is an ISO-8601 timestamp when the backend soft-deletes
 * with a grace period (user can cancel until the date), or `null` when the
 * account is purged immediately. The server action relies on this to decide
 * whether to show a "will delete on X" message or a terminal goodbye.
 */
export interface DeleteAccountResult {
  scheduledDeletionAt: string | null;
}

export interface IAuthGateway {
  getCurrentUser(): Promise<User>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<DeleteAccountResult>;
}
