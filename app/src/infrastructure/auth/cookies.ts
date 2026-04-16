import { cookies } from "next/headers";

export const ACCESS_TOKEN_NAME = "access_token";
export const REFRESH_TOKEN_NAME = "refresh_token";

/** Access token TTL: 15 minutes. */
export const ACCESS_TOKEN_MAX_AGE = 15 * 60;

/** Refresh token TTL: 7 days. */
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

/** Shared cookie options for the access token. */
export const accessTokenCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: ACCESS_TOKEN_MAX_AGE,
  path: "/",
};

/** Shared cookie options for the refresh token. */
export const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: REFRESH_TOKEN_MAX_AGE,
  path: "/",
};

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_NAME, accessToken, accessTokenCookieOptions);
  cookieStore.set(REFRESH_TOKEN_NAME, refreshToken, refreshTokenCookieOptions);
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_NAME);
  cookieStore.delete(REFRESH_TOKEN_NAME);
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_NAME)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_NAME)?.value;
}

const PENDING_PLAN_NAME = "pending_plan";
const PENDING_PLAN_CONTEXT_NAME = "pending_plan_context";

const pendingPlanCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60, // 1 hour
  path: "/",
};

/**
 * Store the selected plan slug so the verify-email flow can redirect to
 * checkout after the user confirms their address.  Short-lived (1 hour),
 * not httpOnly so we could read it client-side if needed, but we read it
 * server-side in the verifyEmail action.
 */
export async function setPendingPlan(
  plan: string,
  isTeam = false,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PENDING_PLAN_NAME, plan, pendingPlanCookieOptions);
  if (isTeam) {
    cookieStore.set(
      PENDING_PLAN_CONTEXT_NAME,
      "team",
      pendingPlanCookieOptions,
    );
  }
}

export interface PendingPlan {
  plan: string;
  isTeam: boolean;
}

export async function consumePendingPlan(): Promise<PendingPlan | undefined> {
  const cookieStore = await cookies();
  const plan = cookieStore.get(PENDING_PLAN_NAME)?.value;
  const context = cookieStore.get(PENDING_PLAN_CONTEXT_NAME)?.value;
  if (plan) {
    cookieStore.delete(PENDING_PLAN_NAME);
    cookieStore.delete(PENDING_PLAN_CONTEXT_NAME);
    return { plan, isTeam: context === "team" };
  }
  return undefined;
}
