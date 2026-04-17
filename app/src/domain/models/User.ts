export type RegistrationMethod = "email" | "google" | "github" | "microsoft";

export interface User {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly avatarUrl: string | null;
  readonly accountType: "personal" | "org_member";
  readonly preferredLocale: string;
  readonly preferredCurrency: string;
  readonly phonePrefix: string | null;
  readonly phone: string | null;
  readonly timezone: string | null;
  readonly jobTitle: string | null;
  readonly pronouns: string | null;
  readonly bio: string | null;
  readonly isVerified: boolean;
  readonly registrationMethod: RegistrationMethod;
  readonly linkedProviders: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly scheduledDeletionAt: string | null;
}
