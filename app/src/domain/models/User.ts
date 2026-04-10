export type RegistrationMethod = "email" | "google" | "github" | "microsoft";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  accountType: "personal" | "org_member";
  preferredLocale: string;
  preferredCurrency: string;
  phonePrefix: string | null;
  phone: string | null;
  timezone: string | null;
  jobTitle: string | null;
  pronouns: string | null;
  bio: string | null;
  isVerified: boolean;
  registrationMethod: RegistrationMethod;
  linkedProviders: string[];
  createdAt: string;
  updatedAt: string;
  scheduledDeletionAt: string | null;
}
