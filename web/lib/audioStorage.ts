import fs from 'fs';
import path from 'path';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'audio');

function localPath(cid: string) {
  // CID is base32 multibase — safe as filename.
  return path.join(LOCAL_DIR, `${cid}.mp3`);
}

export function localMediaUrl(cid: string) {
  return `/api/media/${encodeURIComponent(cid)}`;
}

export function hasLocalAudio(cid: string): boolean {
  try {
    return fs.existsSync(/* turbopackIgnore: true */ localPath(cid));
  } catch {
    return false;
  }
}

export function readLocalAudio(cid: string): Buffer | null {
  const file = localPath(cid);
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  return fs.readFileSync(/* turbopackIgnore: true */ file);
}

/**
 * Persist MP3 bytes to local data/audio and return a playable app URL.
 * (Vercel Blob can be wired later when BLOB_READ_WRITE_TOKEN is available.)
 */
export async function storeAudio(cid: string, bytes: ArrayBuffer | Buffer): Promise<string> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  fs.mkdirSync(/* turbopackIgnore: true */ LOCAL_DIR, { recursive: true });
  fs.writeFileSync(/* turbopackIgnore: true */ localPath(cid), buffer);
  return localMediaUrl(cid);
}
