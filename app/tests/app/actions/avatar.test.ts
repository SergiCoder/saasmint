import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/domain/errors/ApiError";
import { AuthError } from "@/domain/errors/AuthError";

const mockUploadAvatar = vi.fn();
const mockDeleteAvatar = vi.fn();

vi.mock("@/infrastructure/registry", () => ({
  userGateway: {
    uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
    deleteAvatar: (...args: unknown[]) => mockDeleteAvatar(...args),
  },
}));

const { uploadAvatar, deleteAvatar } = await import("@/app/actions/avatar");

beforeEach(() => {
  vi.clearAllMocks();
});

// First 12 bytes for each format we accept — enough for the action's
// magic-byte check. Padding zeros after for the requested overall size.
const IMAGE_HEADERS: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
  "image/webp": [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

function makeImageFormData(
  options: { type?: string; size?: number; bytes?: number[] } = {},
): FormData {
  const { type = "image/webp", size = 1024, bytes } = options;
  const header = bytes ?? IMAGE_HEADERS[type] ?? [];
  const buffer = new Uint8Array(Math.max(size, header.length));
  buffer.set(header, 0);
  const formData = new FormData();
  formData.append("avatar", new File([buffer], "avatar.webp", { type }));
  return formData;
}

describe("uploadAvatar", () => {
  it("calls the gateway and returns avatarUrl on success", async () => {
    mockUploadAvatar.mockResolvedValue({
      avatarUrl: "https://cdn/avatar.webp",
    });

    const formData = makeImageFormData();

    const result = await uploadAvatar(formData);

    expect(mockUploadAvatar).toHaveBeenCalledWith(formData);
    expect(result).toEqual({
      ok: true,
      data: { avatarUrl: "https://cdn/avatar.webp" },
    });
  });

  it("rejects missing file without hitting the gateway", async () => {
    const result = await uploadAvatar(new FormData());
    expect(result).toEqual({ ok: false, code: "no_file" });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects disallowed MIME types", async () => {
    const result = await uploadAvatar(makeImageFormData({ type: "image/gif" }));
    expect(result).toEqual({ ok: false, code: "unsupported_image" });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects files whose magic bytes don't match an allowed image format", async () => {
    // Declared as JPEG but actually empty bytes — defends against `file.type`
    // spoofing on the multipart form upload.
    const result = await uploadAvatar(
      makeImageFormData({ type: "image/jpeg", bytes: new Array(12).fill(0) }),
    );
    expect(result).toEqual({ ok: false, code: "unsupported_image" });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects files over the size limit", async () => {
    const result = await uploadAvatar(
      makeImageFormData({ size: 6 * 1024 * 1024 }),
    );
    expect(result).toEqual({ ok: false, code: "image_too_large" });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("maps AuthError to session_expired", async () => {
    mockUploadAvatar.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ ok: false, code: "session_expired" });
  });

  it("maps ApiError to its stable code, dropping the backend detail", async () => {
    mockUploadAvatar.mockRejectedValue(
      new ApiError(413, { detail: "File too large" }),
    );

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ ok: false, code: "HTTP_413" });
  });

  it("returns the ApiError code when no detail is present", async () => {
    mockUploadAvatar.mockRejectedValue(new ApiError(500, "boom"));

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ ok: false, code: "HTTP_500" });
  });

  it("falls back to unknown_error for unrecognized throwables", async () => {
    mockUploadAvatar.mockRejectedValue(new Error("unexpected"));

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ ok: false, code: "unknown_error" });
  });
});

describe("deleteAvatar", () => {
  it("calls the gateway and returns ok on success", async () => {
    mockDeleteAvatar.mockResolvedValue(undefined);

    const result = await deleteAvatar();

    expect(mockDeleteAvatar).toHaveBeenCalledOnce();
    expect(result).toEqual({ ok: true });
  });

  it("maps AuthError to session_expired", async () => {
    mockDeleteAvatar.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );

    const result = await deleteAvatar();

    expect(result).toEqual({ ok: false, code: "session_expired" });
  });

  it("maps ApiError to its stable code, dropping the backend detail", async () => {
    mockDeleteAvatar.mockRejectedValue(
      new ApiError(404, { detail: "Avatar not found" }),
    );

    const result = await deleteAvatar();

    expect(result).toEqual({ ok: false, code: "HTTP_404" });
  });

  it("returns the ApiError code when no detail is present", async () => {
    mockDeleteAvatar.mockRejectedValue(new ApiError(500, null));

    const result = await deleteAvatar();

    expect(result).toEqual({ ok: false, code: "HTTP_500" });
  });

  it("falls back to unknown_error for unrecognized throwables", async () => {
    mockDeleteAvatar.mockRejectedValue(new Error("unexpected"));

    const result = await deleteAvatar();

    expect(result).toEqual({ ok: false, code: "unknown_error" });
  });
});
