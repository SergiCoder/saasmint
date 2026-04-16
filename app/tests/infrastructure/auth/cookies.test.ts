import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      set: mockSet,
      delete: mockDelete,
      get: mockGet,
    }),
}));

const {
  setAuthCookies,
  clearAuthCookies,
  getAccessToken,
  getRefreshToken,
  setPendingPlan,
  consumePendingPlan,
} = await import("@/infrastructure/auth/cookies");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("setAuthCookies", () => {
  it("sets both access and refresh token cookies", async () => {
    await setAuthCookies("access_abc", "refresh_xyz");

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      "access_token",
      "access_abc",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      "refresh_token",
      "refresh_xyz",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }),
    );
  });

  it("sets access_token maxAge to 15 minutes", async () => {
    await setAuthCookies("a", "r");

    const accessCall = mockSet.mock.calls.find(
      (call: unknown[]) => call[0] === "access_token",
    );
    expect(accessCall?.[2]).toMatchObject({ maxAge: 15 * 60 });
  });
});

describe("clearAuthCookies", () => {
  it("deletes both cookies", async () => {
    await clearAuthCookies();

    expect(mockDelete).toHaveBeenCalledWith("access_token");
    expect(mockDelete).toHaveBeenCalledWith("refresh_token");
  });
});

describe("getAccessToken", () => {
  it("returns the access token value when present", async () => {
    mockGet.mockReturnValue({ value: "access_abc" });

    const result = await getAccessToken();

    expect(mockGet).toHaveBeenCalledWith("access_token");
    expect(result).toBe("access_abc");
  });

  it("returns undefined when no access token cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await getAccessToken();

    expect(result).toBeUndefined();
  });
});

describe("getRefreshToken", () => {
  it("returns the refresh token value when present", async () => {
    mockGet.mockReturnValue({ value: "refresh_xyz" });

    const result = await getRefreshToken();

    expect(mockGet).toHaveBeenCalledWith("refresh_token");
    expect(result).toBe("refresh_xyz");
  });

  it("returns undefined when no refresh token cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await getRefreshToken();

    expect(result).toBeUndefined();
  });
});

describe("setPendingPlan", () => {
  it("sets the pending plan cookie without the context cookie by default", async () => {
    await setPendingPlan("price_pro_monthly");

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      "pending_plan",
      "price_pro_monthly",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      }),
    );
  });

  it("also sets the pending_plan_context cookie when isTeam is true", async () => {
    await setPendingPlan("price_team_pro", true);

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenCalledWith(
      "pending_plan",
      "price_team_pro",
      expect.objectContaining({ maxAge: 60 * 60 }),
    );
    expect(mockSet).toHaveBeenCalledWith(
      "pending_plan_context",
      "team",
      expect.objectContaining({ maxAge: 60 * 60 }),
    );
  });

  it("does not set context cookie when isTeam is false explicitly", async () => {
    await setPendingPlan("price_pro_monthly", false);

    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(
      "pending_plan",
      "price_pro_monthly",
      expect.any(Object),
    );
  });
});

describe("consumePendingPlan", () => {
  it("returns undefined when no pending plan cookie exists", async () => {
    mockGet.mockReturnValue(undefined);

    const result = await consumePendingPlan();

    expect(result).toBeUndefined();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("returns the plan and deletes both cookies when present (personal)", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "pending_plan") return { value: "price_pro_monthly" };
      return undefined;
    });

    const result = await consumePendingPlan();

    expect(result).toEqual({ plan: "price_pro_monthly", isTeam: false });
    expect(mockDelete).toHaveBeenCalledWith("pending_plan");
    expect(mockDelete).toHaveBeenCalledWith("pending_plan_context");
  });

  it("returns isTeam=true when pending_plan_context is 'team'", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "pending_plan") return { value: "price_team_pro" };
      if (name === "pending_plan_context") return { value: "team" };
      return undefined;
    });

    const result = await consumePendingPlan();

    expect(result).toEqual({ plan: "price_team_pro", isTeam: true });
    expect(mockDelete).toHaveBeenCalledWith("pending_plan");
    expect(mockDelete).toHaveBeenCalledWith("pending_plan_context");
  });

  it("returns isTeam=false when context cookie has a different value", async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === "pending_plan") return { value: "price_pro_monthly" };
      if (name === "pending_plan_context") return { value: "personal" };
      return undefined;
    });

    const result = await consumePendingPlan();

    expect(result).toEqual({ plan: "price_pro_monthly", isTeam: false });
  });
});
