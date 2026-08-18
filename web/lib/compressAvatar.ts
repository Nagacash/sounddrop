/**
 * Resize + JPEG-compress an image in the browser for cheap avatar storage.
 * Returns a Blob under AVATAR_TARGET_BYTES when possible.
 */
import {
  AVATAR_MAX_EDGE,
  AVATAR_TARGET_BYTES,
  AVATAR_MAX_BYTES,
} from '@/lib/mediaLimits';

export async function compressAvatarFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('image_only');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  let quality = 0.78;
  let blob: Blob | null = null;
  for (let i = 0; i < 8; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    );
    if (!blob) break;
    if (blob.size <= AVATAR_TARGET_BYTES) break;
    quality -= 0.08;
    if (quality < 0.35) break;
  }

  if (!blob) throw new Error('compress_failed');
  if (blob.size > AVATAR_MAX_BYTES) {
    throw new Error('avatar_too_large');
  }
  return blob;
}
