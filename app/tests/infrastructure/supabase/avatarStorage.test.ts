import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  uploadAvatar,
  deleteAvatar,
} from "@/infrastructure/supabase/avatarStorage";

const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/infrastructure/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

vi.mock("@/infrastructure/supabase/compressImage", () => ({
  compressImage: vi.fn().mockResolvedValue(new Blob(["compressed"])),
}));

describe("avatarStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(1234567890);
  });

  describe("uploadAvatar", () => {
    it("uploads compressed image and returns public URL with cache buster", async () => {
      mockUpload.mockResolvedValue({ error: null });
      mockGetPublicUrl.mockReturnValue({
        data: {
          publicUrl: "https://storage.example.com/avatars/uid/avatar.webp",
        },
      });

      const file = new File(["img"], "photo.png", { type: "image/png" });
      const url = await uploadAvatar("uid", file);

      expect(mockUpload).toHaveBeenCalledWith(
        "uid/avatar.webp",
        expect.any(Blob),
        { contentType: "image/webp", upsert: true },
      );
      expect(mockGetPublicUrl).toHaveBeenCalledWith("uid/avatar.webp");
      expect(url).toBe(
        "https://storage.example.com/avatars/uid/avatar.webp?t=1234567890",
      );
    });

    it("throws when upload fails", async () => {
      mockUpload.mockResolvedValue({ error: new Error("Upload failed") });

      const file = new File(["img"], "photo.png", { type: "image/png" });
      await expect(uploadAvatar("uid", file)).rejects.toThrow("Upload failed");
    });
  });

  describe("deleteAvatar", () => {
    it("removes the avatar file", async () => {
      mockRemove.mockResolvedValue({ error: null });

      await deleteAvatar("uid");

      expect(mockRemove).toHaveBeenCalledWith(["uid/avatar.webp"]);
    });

    it("throws when delete fails", async () => {
      mockRemove.mockResolvedValue({ error: new Error("Delete failed") });

      await expect(deleteAvatar("uid")).rejects.toThrow("Delete failed");
    });
  });
});
