import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  }),
}));

const mockSignOutExecute = vi.fn();
vi.mock("@/application/use-cases/auth/SignOut", () => ({
  SignOut: function SignOut() {
    return { execute: mockSignOutExecute };
  },
}));

vi.mock("@/infrastructure/registry", () => ({
  authGateway: {},
}));

// Force fresh module for each test
let signIn: typeof import("@/app/actions/auth").signIn;
let signUp: typeof import("@/app/actions/auth").signUp;
let signOut: typeof import("@/app/actions/auth").signOut;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import("@/app/actions/auth");
  signIn = mod.signIn;
  signUp = mod.signUp;
  signOut = mod.signOut;
});

describe("auth server actions", () => {
  describe("signIn", () => {
    it("redirects to /dashboard on success", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "secret123");

      await expect(signIn(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "secret123",
      });
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("returns error message on failure", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid credentials" },
      });

      const formData = new FormData();
      formData.set("email", "user@example.com");
      formData.set("password", "wrong");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Invalid credentials" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("redirects to /login on success", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("email", "new@example.com");
      formData.set("password", "secret123");

      await expect(signUp(undefined, formData)).rejects.toThrow(
        "NEXT_REDIRECT",
      );
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "new@example.com",
          password: "secret123",
          options: { emailRedirectTo: "http://localhost:3000/auth/callback" },
        }),
      );
      expect(mockRedirect).toHaveBeenCalledWith("/login?registered=true");
    });

    it("returns error message on failure", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Email already in use" },
      });

      const formData = new FormData();
      formData.set("email", "existing@example.com");
      formData.set("password", "secret123");

      const result = await signUp(undefined, formData);
      expect(result).toEqual({ error: "Email already in use" });
    });
  });

  describe("signIn — validation", () => {
    it("returns error when email is missing", async () => {
      const formData = new FormData();
      formData.set("password", "secret123");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("returns error when password is missing", async () => {
      const formData = new FormData();
      formData.set("email", "user@example.com");

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it("returns error when both fields are missing", async () => {
      const formData = new FormData();

      const result = await signIn(undefined, formData);
      expect(result).toEqual({ error: "Email and password are required" });
    });
  });

  describe("signOut", () => {
    it("executes SignOut use case and redirects to /login", async () => {
      mockSignOutExecute.mockResolvedValue(undefined);

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");
      expect(mockSignOutExecute).toHaveBeenCalledOnce();
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });
});
