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
    expect(result).toEqual({ avatarUrl: "https://cdn/avatar.webp" });
  });

  it("rejects missing file without hitting the gateway", async () => {
    const result = await uploadAvatar(new FormData());
    expect(result).toEqual({ error: "No file provided." });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects disallowed MIME types", async () => {
    const formData = makeImageFormData({ type: "image/gif" });
    const result = await uploadAvatar(formData);
    expect(result).toEqual({ error: "Unsupported image type." });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("rejects files over the size limit", async () => {
    const formData = makeImageFormData({ size: 6 * 1024 * 1024 });
    const result = await uploadAvatar(formData);
    expect(result).toEqual({ error: "Image too large." });
    expect(mockUploadAvatar).not.toHaveBeenCalled();
  });

  it("maps AuthError to a session-expired message", async () => {
    mockUploadAvatar.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({
      error: "Session expired. Please log in again.",
    });
  });

  it("extracts ApiError detail when the upstream body provides one", async () => {
    mockUploadAvatar.mockRejectedValue(
      new ApiError(413, { detail: "File too large" }),
    );

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ error: "File too large" });
  });

  it("returns fallback message for ApiError without detail", async () => {
    mockUploadAvatar.mockRejectedValue(new ApiError(500, "boom"));

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ error: "Upload failed." });
  });

  it("returns fallback message for unknown errors", async () => {
    mockUploadAvatar.mockRejectedValue(new Error("unexpected"));

    const result = await uploadAvatar(makeImageFormData());

    expect(result).toEqual({ error: "Upload failed." });
  });
});

describe("deleteAvatar", () => {
  it("calls the gateway and returns an empty object on success", async () => {
    mockDeleteAvatar.mockResolvedValue(undefined);

    const result = await deleteAvatar();

    expect(mockDeleteAvatar).toHaveBeenCalledOnce();
    expect(result).toEqual({});
  });

  it("maps AuthError to a session-expired message", async () => {
    mockDeleteAvatar.mockRejectedValue(
      new AuthError("No active session", "NO_SESSION"),
    );

    const result = await deleteAvatar();

    expect(result).toEqual({
      error: "Session expired. Please log in again.",
    });
  });

  it("extracts ApiError detail when the upstream body provides one", async () => {
    mockDeleteAvatar.mockRejectedValue(
      new ApiError(404, { detail: "Avatar not found" }),
    );

    const result = await deleteAvatar();

    expect(result).toEqual({ error: "Avatar not found" });
  });

  it("returns fallback message for ApiError without detail", async () => {
    mockDeleteAvatar.mockRejectedValue(new ApiError(500, null));

    const result = await deleteAvatar();

    expect(result).toEqual({ error: "Delete failed." });
  });

  it("returns fallback message for unknown errors", async () => {
    mockDeleteAvatar.mockRejectedValue(new Error("unexpected"));

    const result = await deleteAvatar();

    expect(result).toEqual({ error: "Delete failed." });
  });
});
