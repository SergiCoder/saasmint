export interface User {
  id: string;
  supabaseUid: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: "personal" | "org_member";
  preferredLocale: string;
  preferredCurrency: string;
  phonePrefix: string | null;
  phone: string | null;
  timezone: string | null;
  jobTitle: string | null;
  bio: string | null;
  isVerified: boolean;
  createdAt: string;
}
