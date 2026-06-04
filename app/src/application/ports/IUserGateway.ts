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
  pronouns?: string | null;
  bio?: string | null;
}

export interface IUserGateway {
  getProfile(): Promise<User>;
  updateProfile(input: UpdateProfileInput): Promise<User>;
  uploadAvatar(formData: FormData): Promise<{ avatarUrl: string }>;
  deleteAvatar(): Promise<void>;
}
