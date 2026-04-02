import type { User } from "@/domain/models/User";

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string | null;
  preferredLocale?: string;
  preferredCurrency?: string;
  phonePrefix?: string | null;
  phone?: string | null;
  timezone?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
}

export interface IUserGateway {
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<User>;
}
