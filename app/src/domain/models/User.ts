export interface User {
  id: string;
  supabaseUid: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  accountType: "personal" | "org_member";
  preferredLocale: string;
  preferredCurrency: string;
  isVerified: boolean;
  createdAt: string;
}
