const MAX_SIZE = 256;
const MAX_INPUT_DIMENSION = 8192;
const QUALITY = 0.8;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function compressImage(file: File): Promise<Blob> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return Promise.reject(new Error(`Unsupported image type: ${file.type}`));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (img.width > MAX_INPUT_DIMENSION || img.height > MAX_INPUT_DIMENSION) {
        reject(
          new Error(
            `Image too large: ${img.width}x${img.height} (max ${MAX_INPUT_DIMENSION}px)`,
          ),
        );
        return;
      }
      const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob returned null"));
        },
        "image/webp",
        QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}
