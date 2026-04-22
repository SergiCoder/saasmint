import type { User } from "@/domain/models/User";

export interface IAuthGateway {
  getCurrentUser(): Promise<User>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
}
