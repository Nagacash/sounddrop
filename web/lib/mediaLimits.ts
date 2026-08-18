/** Free-tier friendly media limits. */

/** Max side length after client resize (px). */
export const AVATAR_MAX_EDGE = 512;

/** Hard server reject above this (bytes). */
export const AVATAR_MAX_BYTES = 150_000; // ~150 KB

/** Client tries to land under this before upload. */
export const AVATAR_TARGET_BYTES = 100_000;

/** Max MP3 upload size. */
export const AUDIO_MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
