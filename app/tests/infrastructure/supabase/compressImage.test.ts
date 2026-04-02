import { describe, it, expect, vi, beforeEach } from "vitest";
import { compressImage } from "@/infrastructure/supabase/compressImage";

describe("compressImage", () => {
  let mockCtx: { drawImage: ReturnType<typeof vi.fn> };
  let mockCanvas: {
    width: number;
    height: number;
    getContext: ReturnType<typeof vi.fn>;
    toBlob: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCtx = { drawImage: vi.fn() };
    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn(),
    };

    vi.spyOn(document, "createElement").mockImplementation(
      (tag: string) =>
        (tag === "canvas"
          ? mockCanvas
          : document.createElement(tag)) as HTMLElement,
    );
  });

  function mockImage(width: number, height: number) {
    vi.stubGlobal(
      "Image",
      class {
        width = width;
        height = height;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_val: string) {
          setTimeout(() => this.onload?.(), 0);
        }
      },
    );
  }

  it("resolves with a compressed blob in webp format", async () => {
    mockImage(256, 256);
    const fakeBlob = new Blob(["compressed"], { type: "image/webp" });
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) =>
      cb(fakeBlob),
    );

    const file = new File(["img"], "photo.png", { type: "image/png" });
    const result = await compressImage(file);

    expect(result).toBe(fakeBlob);
    expect(mockCanvas.getContext).toHaveBeenCalledWith("2d");
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/webp",
      0.8,
    );
  });

  it("scales down images larger than 256px", async () => {
    mockImage(1024, 512);
    const fakeBlob = new Blob(["compressed"], { type: "image/webp" });
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) =>
      cb(fakeBlob),
    );

    const file = new File(["img"], "big.png", { type: "image/png" });
    await compressImage(file);

    // 1024 wide → scale = 256/1024 = 0.25 → 256x128
    expect(mockCanvas.width).toBe(256);
    expect(mockCanvas.height).toBe(128);
  });

  it("does not upscale small images", async () => {
    mockImage(100, 80);
    const fakeBlob = new Blob(["compressed"], { type: "image/webp" });
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) =>
      cb(fakeBlob),
    );

    const file = new File(["img"], "small.png", { type: "image/png" });
    await compressImage(file);

    expect(mockCanvas.width).toBe(100);
    expect(mockCanvas.height).toBe(80);
  });

  it("rejects when toBlob returns null", async () => {
    mockImage(256, 256);
    mockCanvas.toBlob.mockImplementation((cb: (b: Blob | null) => void) =>
      cb(null),
    );

    const file = new File(["img"], "photo.png", { type: "image/png" });
    await expect(compressImage(file)).rejects.toThrow(
      "Canvas toBlob returned null",
    );
  });
});
