import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthError } from "@/domain/errors/AuthError";

const mockGetAuthToken = vi.fn();

vi.mock("@/infrastructure/api/apiClient", () => ({
  getAuthToken: () => mockGetAuthToken(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { uploadAvatar, deleteAvatar } = await import("@/app/actions/avatar");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadAvatar", () => {
  it("uploads formData and returns avatarUrl on success", async () => {
    mockGetAuthToken.mockResolvedValue("token_abc");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ avatar_url: "https://cdn/avatar.webp" }),
    });

    const formData = new FormData();
    formData.append("avatar", new Blob(["img"]));

    const result = await uploadAvatar(formData);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/account/avatar/"),
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer token_abc" },
        body: formData,
      }),
    );
    expect(result).toEqual({ avatarUrl: "https://cdn/avatar.webp" });
  });

  it("returns error when session is expired (AuthError)", async () => {
    mockGetAuthToken.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );

    const result = await uploadAvatar(new FormData());

    expect(result).toEqual({
      error: "Session expired. Please log in again.",
    });
  });

  it("returns error when getAuthToken throws a non-auth error", async () => {
    mockGetAuthToken.mockRejectedValue(new Error("unexpected"));

    const result = await uploadAvatar(new FormData());

    expect(result).toEqual({ error: "Upload failed." });
  });

  it("returns API error detail when response is not ok (JSON body)", async () => {
    mockGetAuthToken.mockResolvedValue("token_abc");
    mockFetch.mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ detail: "File too large" }),
    });

    const result = await uploadAvatar(new FormData());

    expect(result).toEqual({ error: "File too large" });
  });

  it("returns fallback error when response is not ok (non-JSON body)", async () => {
    mockGetAuthToken.mockResolvedValue("token_abc");
    mockFetch.mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "text/plain" }),
    });

    const result = await uploadAvatar(new FormData());

    expect(result).toEqual({ error: "Upload failed." });
  });
});

describe("deleteAvatar", () => {
  it("sends DELETE request and returns empty object on success", async () => {
    mockGetAuthToken.mockResolvedValue("token_abc");
    mockFetch.mockResolvedValue({ ok: true });

    const result = await deleteAvatar();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/account/avatar/"),
      expect.objectContaining({
        method: "DELETE",
        headers: { Authorization: "Bearer token_abc" },
      }),
    );
    expect(result).toEqual({});
  });

  it("returns error when session is expired", async () => {
    mockGetAuthToken.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );

    const result = await deleteAvatar();

    expect(result).toEqual({
      error: "Session expired. Please log in again.",
    });
  });

  it("returns API error detail when delete fails (JSON body)", async () => {
    mockGetAuthToken.mockResolvedValue("token_abc");
    mockFetch.mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ detail: "Avatar not found" }),
    });

    const result = await deleteAvatar();

    expect(result).toEqual({ error: "Avatar not found" });
  });

  it("returns fallback error when delete fails (non-JSON body)", async () => {
    mockGetAuthToken.mockResolvedValue("token_abc");
    mockFetch.mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "text/plain" }),
    });

    const result = await deleteAvatar();

    expect(result).toEqual({ error: "Delete failed." });
  });
});
