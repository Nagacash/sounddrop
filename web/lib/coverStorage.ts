import fs from 'fs';
import path from 'path';
import { createServiceClient } from '@/utils/supabase/admin';
import { TRACK_AUDIO_BUCKET } from '@/lib/audioStorage';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'covers');

function coverObjectPath(cid: string) {
  return `covers/${cid}.jpg`;
}

function localCoverPath(cid: string) {
  return path.join(LOCAL_DIR, `${cid}.jpg`);
}

function supabaseBaseUrl(): string | null {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

function hasSupabaseSecret(): boolean {
  return Boolean(supabaseBaseUrl() && process.env.SUPABASE_SECRET_KEY);
}

export function publicCoverUrl(cid: string): string | null {
  const base = supabaseBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${TRACK_AUDIO_BUCKET}/${coverObjectPath(cid)}`;
}

export function localCoverMediaUrl(cid: string) {
  return `/api/covers/${encodeURIComponent(cid)}`;
}

/** Store square JPEG cover for a track CID. */
export async function storeCover(cid: string, bytes: ArrayBuffer | Buffer): Promise<string> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

  if (!hasSupabaseSecret()) {
    if (process.env.VERCEL) {
      throw new Error('SUPABASE_SECRET_KEY is required on Vercel to store covers');
    }
    try {
      fs.mkdirSync(/* turbopackIgnore: true */ LOCAL_DIR, { recursive: true });
      fs.writeFileSync(/* turbopackIgnore: true */ localCoverPath(cid), buffer);
    } catch {
      // ignore
    }
    return localCoverMediaUrl(cid);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(TRACK_AUDIO_BUCKET).upload(coverObjectPath(cid), buffer, {
    contentType: 'image/jpeg',
    upsert: true,
    cacheControl: '31536000',
  });

  if (error) {
    console.error('[coverStorage] upload failed', error);
    throw new Error(`cover_upload_failed: ${error.message}`);
  }

  const url = publicCoverUrl(cid);
  if (!url) throw new Error('cover_public_url_missing');
  return url;
}

export async function deleteCover(cid: string): Promise<void> {
  if (hasSupabaseSecret()) {
    try {
      const supabase = createServiceClient();
      await supabase.storage.from(TRACK_AUDIO_BUCKET).remove([coverObjectPath(cid)]);
    } catch (err) {
      console.warn('[coverStorage] remove failed', err);
    }
  }
  try {
    const file = localCoverPath(cid);
    if (fs.existsSync(/* turbopackIgnore: true */ file)) {
      fs.unlinkSync(/* turbopackIgnore: true */ file);
    }
  } catch {
    // ignore
  }
}

export function readLocalCover(cid: string): Buffer | null {
  const file = localCoverPath(cid);
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  return fs.readFileSync(/* turbopackIgnore: true */ file);
}
