import { ApiError } from "@/domain/errors/ApiError";
import { AuthError } from "@/domain/errors/AuthError";
import { BillingError } from "@/domain/errors/BillingError";
import { NetworkError } from "@/domain/errors/NetworkError";

/**
 * Stable envelope returned by every server action. Callers either hit the
 * `ok: true` branch (with optional `data`) or the `ok: false` branch
 * (with a stable `code` that form components translate via next-intl under
 * the `actionErrors.<code>` namespace). `message` is a server-provided
 * override (typically from {@link ApiError.detail}); `fieldErrors` carries
 * per-input validation messages keyed by form-field name.
 */
export type ActionOk<T> = T extends void
  ? { readonly ok: true }
  : { readonly ok: true; readonly data: T };

export type ActionErr = {
  readonly ok: false;
  readonly code: string;
  readonly message?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
};

export type ActionResult<T = void> = ActionOk<T> | ActionErr;

export function ok(): ActionResult<void>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T> {
  // The `as ActionResult<T>` cast bridges a TypeScript limitation: ActionOk<T>
  // is a conditional type (`T extends void ? { ok: true } : { ok: true; data: T }`)
  // and TS can't evaluate the conditional at the call-site to prove which
  // branch is satisfied. The runtime ternary mirrors the conditional 1:1, so
  // the cast is sound: when `data === undefined` we return the void shape,
  // otherwise the data shape.
  return (
    data === undefined ? { ok: true } : { ok: true, data }
  ) as ActionResult<T>;
}

export function fail(
  code: string,
  extras?: { message?: string; fieldErrors?: Record<string, string> },
): ActionErr {
  return {
    ok: false,
    code,
    ...(extras?.message ? { message: extras.message } : {}),
    ...(extras?.fieldErrors ? { fieldErrors: extras.fieldErrors } : {}),
  };
}

/**
 * Map a thrown gateway/domain error to an {@link ActionErr}. Prefers the
 * domain error's stable `code` field; for {@link ApiError} also forwards
 * the server-provided detail as `message`. Unknown throwables collapse to
 * `unknown_error`.
 */
export function toActionError(err: unknown): ActionErr {
  if (err instanceof AuthError) {
    return { ok: false, code: "session_expired" };
  }
  if (err instanceof NetworkError) {
    return { ok: false, code: "network_unreachable" };
  }
  if (err instanceof BillingError) {
    return { ok: false, code: err.code };
  }
  if (err instanceof ApiError) {
    const detail = err.detail;
    return detail
      ? { ok: false, code: err.code, message: detail }
      : { ok: false, code: err.code };
  }
  return { ok: false, code: "unknown_error" };
}
