/**
 * Backend column accepts up to 255 chars; the 3-char floor mirrors the Django
 * validator. Returns the action error code on failure so callers can pass it
 * straight to `fail(...)`.
 */
const FULL_NAME_MIN_LENGTH = 3;
const FULL_NAME_MAX_LENGTH = 255;

export function validateFullName(
  name: string | undefined,
): "full_name_invalid" | null {
  if (
    !name ||
    name.length < FULL_NAME_MIN_LENGTH ||
    name.length > FULL_NAME_MAX_LENGTH
  ) {
    return "full_name_invalid";
  }
  return null;
}
