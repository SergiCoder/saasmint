/**
 * Single source of truth for the frontend's minimum-password-length rule.
 * Must match Django's `MinimumLengthValidator` in
 * `saasmint-core/config/settings/base.py`. Consumed by both server-action
 * pre-checks and the `minLength` attribute on password inputs so the client
 * constraint cannot drift from the server contract.
 */
export const PASSWORD_MIN_LENGTH = 10;

export type PasswordValidationCode =
  | "password_too_short"
  | "passwords_do_not_match";

/**
 * Validates a new password and (optionally) its confirmation. Returns the
 * action error code on failure so callers can pass it directly to `fail(...)`.
 * Shared by `resetPasswordWithToken`, `changePassword`, and `acceptInvitation`.
 */
export function validateNewPassword(
  password: string | undefined,
  confirmPassword?: string | undefined,
): PasswordValidationCode | null {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return "password_too_short";
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return "passwords_do_not_match";
  }
  return null;
}
