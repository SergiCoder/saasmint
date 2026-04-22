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

function makeImageFormData(
  options: { type?: string; size?: number } = {},
): FormData {
  const { type = "image/webp", size = 1024 } = options;
  const formData = new FormData();
  formData.append(
    "avatar",
    new File([new Uint8Array(size)], "avatar.webp", { type }),
  );
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

  it("extracts ApiError detail as message", async () => {
    mockUploadAvatar.mockRejectedValue(
      new ApiError(413, { detail: "File too large" }),
    );

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({
      ok: false,
      code: "HTTP_413",
      message: "File too large",
    });
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

  it("extracts ApiError detail as message", async () => {
    mockDeleteAvatar.mockRejectedValue(
      new ApiError(404, { detail: "Avatar not found" }),
    );

    const result = await deleteAvatar();

    expect(result).toEqual({
      ok: false,
      code: "HTTP_404",
      message: "Avatar not found",
    });
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
