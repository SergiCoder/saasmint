import { ApiError } from "@/domain/errors/ApiError";
import { NetworkError } from "@/domain/errors/NetworkError";

/**
 * Extract a human-readable message from an error thrown by the gateway layer.
 * Falls back to `fallback` when the error isn't a recognised domain error
 * with a user-facing message.
 */
export function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof NetworkError) return err.message;
  if (err instanceof ApiError) {
    const detail = err.detail;
    if (detail) return detail;
  }
  return fallback;
}
