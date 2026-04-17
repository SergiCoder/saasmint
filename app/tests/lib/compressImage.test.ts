import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { compressImage } from "@/lib/compressImage";

/**
 * jsdom does not implement HTMLImageElement decoding, URL.createObjectURL, or
 * HTMLCanvasElement.toBlob. Each test wires up stubs that simulate an image
 * "loading" with configurable dimensions so we can exercise the branches in
 * compressImage without a real browser.
 */

let imageInstances: Array<{
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  set src(_v: string);
}> = [];

const createObjectURL = vi.fn(() => "blob://fake");
const revokeObjectURL = vi.fn();

function mockImageLoad(width: number, height: number): void {
  class FakeImage {
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      // Simulate async image decode
      this.width = width;
      this.height = height;
      queueMicrotask(() => this.onload?.());
    }
    constructor() {
      imageInstances.push(this as never);
    }
  }
  // @ts-expect-error jsdom's Image is overridable for tests
  globalThis.Image = FakeImage;
}

function mockImageError(): void {
  class FakeImage {
    width = 0;
    height = 0;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => this.onerror?.());
    }
  }
  // @ts-expect-error jsdom's Image is overridable for tests
  globalThis.Image = FakeImage;
}

beforeEach(() => {
  imageInstances = [];
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  URL.createObjectURL =
    createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL =
    revokeObjectURL as unknown as typeof URL.revokeObjectURL;

  // Stub canvas.toBlob so resolve() fires with a fake Blob.
  const realGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    type: string,
  ) {
    if (type === "2d") {
      return {
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    }
    return realGetContext.call(this, type as "2d");
  } as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function toBlob(
    cb: BlobCallback,
    type?: string,
  ) {
    cb(new Blob(["x"], { type: type ?? "image/webp" }));
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("compressImage", () => {
  it("rejects unsupported MIME types without loading the image", async () => {
    const file = new File(["x"], "pic.gif", { type: "image/gif" });

    await expect(compressImage(file)).rejects.toThrow(
      /Unsupported image type: image\/gif/,
    );
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it("resolves with a Blob for a valid small image", async () => {
    mockImageLoad(1024, 768);
    const file = new File(["x"], "pic.webp", { type: "image/webp" });

    const blob = await compressImage(file);

    expect(blob).toBeInstanceOf(Blob);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob://fake");
  });

  it("rejects images wider than MAX_INPUT_DIMENSION (8192px)", async () => {
    mockImageLoad(8193, 100);
    const file = new File(["x"], "pic.png", { type: "image/png" });

    await expect(compressImage(file)).rejects.toThrow(
      /Image too large: 8193x100 \(max 8192px\)/,
    );
    // Must still release the object URL before rejecting to avoid leaks
    expect(revokeObjectURL).toHaveBeenCalledWith("blob://fake");
  });

  it("rejects images taller than MAX_INPUT_DIMENSION", async () => {
    mockImageLoad(100, 10000);
    const file = new File(["x"], "pic.jpeg", { type: "image/jpeg" });

    await expect(compressImage(file)).rejects.toThrow(/Image too large/);
  });

  it("accepts images exactly at the 8192px boundary", async () => {
    mockImageLoad(8192, 8192);
    const file = new File(["x"], "pic.jpeg", { type: "image/jpeg" });

    const blob = await compressImage(file);
    expect(blob).toBeInstanceOf(Blob);
  });

  it("rejects when the image fails to load", async () => {
    mockImageError();
    const file = new File(["x"], "pic.png", { type: "image/png" });

    await expect(compressImage(file)).rejects.toThrow(/Failed to load image/);
  });
});
