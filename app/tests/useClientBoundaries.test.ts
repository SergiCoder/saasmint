import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(process.cwd(), "src");

/**
 * The canonical set of files that legitimately start with "use client".
 * When this list changes, the diff should be reviewed — a new entry means
 * a new client boundary (extra JS shipped to the browser); a removed entry
 * means a successful server-render. Keep this sorted for stable diffs.
 */
const EXPECTED_USE_CLIENT_FILES: readonly string[] = [
  "src/app/[locale]/(app)/error.tsx",
  "src/app/[locale]/(app)/org/[slug]/_components/InviteByEmailForm.tsx",
  "src/app/[locale]/(app)/org/[slug]/_components/MemberActions.tsx",
  "src/app/[locale]/(app)/org/[slug]/_components/SeatManager.tsx",
  "src/app/[locale]/(app)/org/[slug]/_components/TransferOwnershipForm.tsx",
  "src/app/[locale]/(app)/profile/_components/ChangePasswordForm.tsx",
  "src/app/[locale]/(app)/profile/_components/DangerZone.tsx",
  "src/app/[locale]/(app)/profile/_components/DeleteAccountDialog.tsx",
  "src/app/[locale]/(app)/profile/_components/ProfileForm.tsx",
  "src/app/[locale]/(app)/subscription/_components/CancelRenewalButton.tsx",
  "src/app/[locale]/(app)/subscription/_components/CheckoutButton.tsx",
  "src/app/[locale]/(app)/subscription/_components/ResumeSubscriptionButton.tsx",
  "src/app/[locale]/(app)/subscription/team-checkout/_components/TeamCheckoutForm.tsx",
  "src/app/[locale]/(auth)/_components/AuthForm.tsx",
  "src/app/[locale]/(auth)/error.tsx",
  "src/app/[locale]/(auth)/forgot-password/_components/ForgotPasswordForm.tsx",
  "src/app/[locale]/(auth)/reset-password/_components/ResetPasswordForm.tsx",
  "src/app/[locale]/(auth)/verify-email/_components/VerifyEmailClient.tsx",
  "src/app/[locale]/(marketing)/contact/_components/ContactForm.tsx",
  "src/app/[locale]/(marketing)/error.tsx",
  "src/app/[locale]/(public)/error.tsx",
  "src/app/[locale]/(public)/invitations/[token]/_components/AcceptInvitationForm.tsx",
  "src/app/[locale]/auth/callback/_components/AuthCallbackClient.tsx",
  "src/app/global-error.tsx",
  "src/presentation/components/atoms/AvatarUpload.tsx",
  "src/presentation/components/atoms/LocaleDropdown.tsx",
  "src/presentation/components/molecules/ConfirmDialog.tsx",
  "src/presentation/components/molecules/OAuthButtons.tsx",
  "src/presentation/components/molecules/PronounsPicker.tsx",
  "src/presentation/components/molecules/UserMenu.tsx",
  "src/presentation/components/organisms/MobileMenuToggle.tsx",
  "src/presentation/components/organisms/PricingIntervalSwitch.tsx",
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...walk(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function firstNonEmptyLine(source: string): string {
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

describe('"use client" boundaries', () => {
  it("exactly matches the committed snapshot", () => {
    const actual = walk(SRC_ROOT)
      .filter((path) => {
        const first = firstNonEmptyLine(readFileSync(path, "utf8"));
        return first === '"use client";' || first === "'use client';";
      })
      .map((path) => relative(process.cwd(), path).replaceAll("\\", "/"))
      .sort();

    // Deep equality — any addition, removal, or rename fails the test and
    // forces a conscious update to EXPECTED_USE_CLIENT_FILES. This guards
    // against silent client-boundary drift.
    expect(actual).toEqual([...EXPECTED_USE_CLIENT_FILES].sort());
  });
});
