import { MAX_PHOTO_DATA_URL_LENGTH } from "@orions-cookbook/core";

/**
 * Shared client-side image compression for inline photos (Receipt Photo, Dish Photo — ADR-0002).
 *
 * A user-picked image is downscaled so its longest edge is at most `maxEdge` (default 1024) and
 * re-encoded as a JPEG, dropping quality if needed to stay under `maxLength` characters (the same
 * bound the Zod schemas enforce). The result is a `data:image/jpeg;base64,…` string small enough
 * to ride the normal sync outbox/mirror and live offline. Everything runs in an offscreen canvas;
 * no upload, no network.
 */
export async function compressImage(
  file: File,
  {
    maxEdge = 1024,
    quality = 0.7,
    maxLength = MAX_PHOTO_DATA_URL_LENGTH,
  }: { maxEdge?: number; quality?: number; maxLength?: number } = {},
): Promise<string> {
  const source = await loadImage(file);
  const { width, height } = dimensionsOf(source);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(source, 0, 0, w, h);
  if ("close" in source) source.close();

  // Step quality down until the data URL fits the cap; never throw — the last attempt is returned
  // and the schema's max guards the boundary if a stubborn image is still too large.
  for (const q of [quality, 0.5, 0.35, 0.25]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= maxLength) return url;
  }
  return canvas.toDataURL("image/jpeg", 0.2);
}

function dimensionsOf(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/**
 * Decode a picked file to something drawable. Prefers `createImageBitmap` with EXIF orientation
 * applied (so portrait phone photos aren't sideways), falling back to an `<img>` + object URL.
 */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Older browsers may not support the orientation option — fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
