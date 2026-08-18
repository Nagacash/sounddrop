/**
 * Square-ish JPEG compress for track cover thumbnails (not profile avatars).
 */
import {
  COVER_MAX_EDGE,
  COVER_TARGET_BYTES,
  COVER_MAX_BYTES,
} from '@/lib/mediaLimits';

export async function compressCoverFile(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('image_only');
  }

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = Math.floor((bitmap.width - side) / 2);
  const sy = Math.floor((bitmap.height - side) / 2);
  const out = Math.min(COVER_MAX_EDGE, side);

  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, out, out);
  bitmap.close();

  let quality = 0.82;
  let blob: Blob | null = null;
  for (let i = 0; i < 8; i++) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality),
    );
    if (!blob) break;
    if (blob.size <= COVER_TARGET_BYTES) break;
    quality -= 0.08;
    if (quality < 0.4) break;
  }

  if (!blob) throw new Error('compress_failed');
  if (blob.size > COVER_MAX_BYTES) {
    throw new Error('cover_too_large');
  }
  return blob;
}
