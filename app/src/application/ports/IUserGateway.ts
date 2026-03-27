import type { User } from "@/domain/models/User";

export interface UpdateProfileInput {
  fullName?: string | null;
  avatarUrl?: string | null;
  preferredLocale?: string;
  preferredCurrency?: string;
}

export interface IUserGateway {
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<User>;
}
