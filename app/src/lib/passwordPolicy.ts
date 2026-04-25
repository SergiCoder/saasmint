/**
 * Single source of truth for the frontend's minimum-password-length rule.
 * Must match Django's `MinimumLengthValidator` in
 * `saasmint-core/config/settings/base.py`. Consumed by both server-action
 * pre-checks and the `minLength` attribute on password inputs so the client
 * constraint cannot drift from the server contract.
 */
export const PASSWORD_MIN_LENGTH = 10;
