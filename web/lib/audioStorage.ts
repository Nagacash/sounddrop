import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { createServiceClient } from '@/utils/supabase/admin';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'audio');
export const TRACK_AUDIO_BUCKET = 'track-audio';

function localPath(cid: string) {
  return path.join(LOCAL_DIR, `${cid}.mp3`);
}

export function localMediaUrl(cid: string) {
  return `/api/media/${encodeURIComponent(cid)}`;
}

function objectPath(cid: string) {
  return `${cid}.mp3`;
}

function supabaseBaseUrl(): string | null {
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
}

/** Public CDN URL for a track in the track-audio bucket. */
export function publicStorageUrl(cid: string): string | null {
  const base = supabaseBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${TRACK_AUDIO_BUCKET}/${objectPath(cid)}`;
}

function hasSupabaseSecret(): boolean {
  return Boolean(supabaseBaseUrl() && process.env.SUPABASE_SECRET_KEY);
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

function toBuffer(value: unknown): Buffer | null {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'string') {
    if (value.startsWith('\\x')) return Buffer.from(value.slice(2), 'hex');
    try {
      return Buffer.from(value, 'base64');
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && value !== null && 'data' in (value as object)) {
    const data = (value as { data: number[] }).data;
    if (Array.isArray(data)) return Buffer.from(data);
  }
  return null;
}

export function readLocalAudio(cid: string): Buffer | null {
  const file = localPath(cid);
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  return fs.readFileSync(/* turbopackIgnore: true */ file);
}

function writeLocalAudio(cid: string, buffer: Buffer) {
  try {
    fs.mkdirSync(/* turbopackIgnore: true */ LOCAL_DIR, { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ localPath(cid), buffer);
  } catch {
    // Local cache is best-effort (Vercel FS is ephemeral).
  }
}

async function readFromSupabase(cid: string): Promise<Buffer | null> {
  // Prefer service role download (works even if bucket is private).
  if (hasSupabaseSecret()) {
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase.storage
        .from(TRACK_AUDIO_BUCKET)
        .download(objectPath(cid));
      if (!error && data) {
        const buf = Buffer.from(await data.arrayBuffer());
        if (buf.length) return buf;
      }
    } catch (err) {
      console.error('[audioStorage] supabase download failed', err);
    }
  }

  // Public URL fallback (bucket is public-read).
  const url = publicStorageUrl(cid);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? buf : null;
  } catch (err) {
    console.error('[audioStorage] public fetch failed', err);
    return null;
  }
}

async function readFromNeon(cid: string): Promise<Buffer | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      SELECT bytes FROM track_audio WHERE cid = ${cid} LIMIT 1
    `;
    return toBuffer(rows[0]?.bytes);
  } catch (err) {
    console.error('[audioStorage] neon read failed', err);
    return null;
  }
}

/** Read MP3 bytes: Supabase Storage → Neon (legacy) → local cache. */
export async function readAudio(cid: string): Promise<Buffer | null> {
  const fromSupabase = await readFromSupabase(cid);
  if (fromSupabase?.length) {
    writeLocalAudio(cid, fromSupabase);
    return fromSupabase;
  }

  const fromNeon = await readFromNeon(cid);
  if (fromNeon?.length) {
    writeLocalAudio(cid, fromNeon);
    return fromNeon;
  }

  return readLocalAudio(cid);
}

/**
 * Persist MP3 to Supabase Storage (primary).
 * Local disk is only a cache for local/dev without Supabase secret.
 */
export async function storeAudio(cid: string, bytes: ArrayBuffer | Buffer): Promise<string> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

  if (!hasSupabaseSecret()) {
    if (process.env.VERCEL) {
      throw new Error('SUPABASE_SECRET_KEY is required on Vercel to store audio');
    }
    // Local/dev without Supabase: keep files on disk.
    writeLocalAudio(cid, buffer);
    return localMediaUrl(cid);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(TRACK_AUDIO_BUCKET).upload(objectPath(cid), buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
    cacheControl: '31536000',
  });

  if (error) {
    console.error('[audioStorage] supabase upload failed', error);
    throw new Error(`supabase_upload_failed: ${error.message}`);
  }

  const url = publicStorageUrl(cid);
  if (!url) {
    throw new Error('supabase_public_url_missing');
  }

  // Best-effort verify the object is readable.
  try {
    const check = await fetch(url, { method: 'HEAD' });
    if (!check.ok) {
      // Upload can succeed before public CDN is ready; download via service role.
      const { data, error: dlErr } = await supabase.storage
        .from(TRACK_AUDIO_BUCKET)
        .download(objectPath(cid));
      if (dlErr || !data) {
        throw new Error('audio_store_verify_failed');
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'audio_store_verify_failed') throw err;
    console.warn('[audioStorage] verify skipped/failed', err);
  }

  writeLocalAudio(cid, buffer);
  return url;
}

/** Best-effort remove of stored MP3 (Supabase + legacy Neon + local cache). */
export async function deleteAudio(cid: string): Promise<void> {
  if (hasSupabaseSecret()) {
    try {
      const supabase = createServiceClient();
      const { error } = await supabase.storage.from(TRACK_AUDIO_BUCKET).remove([objectPath(cid)]);
      if (error) console.warn('[audioStorage] supabase remove failed', error);
    } catch (err) {
      console.warn('[audioStorage] supabase remove error', err);
    }
  }

  const sql = getSql();
  if (sql) {
    try {
      await sql`DELETE FROM track_audio WHERE cid = ${cid}`;
    } catch (err) {
      console.warn('[audioStorage] neon audio delete failed', err);
    }
  }

  try {
    const file = localPath(cid);
    if (fs.existsSync(/* turbopackIgnore: true */ file)) {
      fs.unlinkSync(/* turbopackIgnore: true */ file);
    }
  } catch {
    // ignore
  }
}
