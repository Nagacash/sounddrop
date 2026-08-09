import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'audio');

function localPath(cid: string) {
  return path.join(LOCAL_DIR, `${cid}.mp3`);
}

export function localMediaUrl(cid: string) {
  return `/api/media/${encodeURIComponent(cid)}`;
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
    // neon may return hex (\x...) or base64 depending on driver/settings
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

/** Read MP3 bytes from Neon (durable) or local cache. */
export async function readAudio(cid: string): Promise<Buffer | null> {
  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT bytes FROM track_audio WHERE cid = ${cid} LIMIT 1
      `;
      const buf = toBuffer(rows[0]?.bytes);
      if (buf?.length) {
        writeLocalAudio(cid, buf);
        return buf;
      }
    } catch (err) {
      console.error('[audioStorage] neon read failed', err);
    }
  }
  return readLocalAudio(cid);
}

/**
 * Persist MP3 bytes. Neon track_audio is the source of truth when DATABASE_URL
 * is set so playback works on Vercel; local disk is a cache.
 */
export async function storeAudio(cid: string, bytes: ArrayBuffer | Buffer): Promise<string> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const sql = getSql();

  if (sql) {
    // Store as base64 text via decode — reliable across neon-http bindings.
    const b64 = buffer.toString('base64');
    await sql`
      INSERT INTO track_audio (cid, bytes, content_type)
      VALUES (${cid}, decode(${b64}, 'base64'), 'audio/mpeg')
      ON CONFLICT (cid) DO UPDATE
      SET bytes = EXCLUDED.bytes,
          content_type = EXCLUDED.content_type
    `;
  }

  writeLocalAudio(cid, buffer);
  return localMediaUrl(cid);
}
