import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { COVER_MAX_BYTES } from '@/lib/mediaLimits';

const LOCAL_DIR = path.join(process.cwd(), 'data', 'covers');

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

function localCoverPath(cid: string) {
  return path.join(LOCAL_DIR, `${cid}.jpg`);
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
  return null;
}

export function coverMediaUrl(cid: string) {
  return `/api/covers/${encodeURIComponent(cid)}`;
}

async function ensureCoverTable() {
  const sql = getSql();
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS track_covers (
      cid TEXT PRIMARY KEY,
      bytes BYTEA NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'image/jpeg',
      byte_size INT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

/** Store square JPEG cover for a track CID. Returns a stable app URL. */
export async function storeCover(
  cid: string,
  bytes: ArrayBuffer | Buffer,
  contentType = 'image/jpeg',
): Promise<string> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buffer.length > COVER_MAX_BYTES) {
    throw new Error('cover_too_large');
  }
  if (!contentType.startsWith('image/')) {
    throw new Error('image_only');
  }

  const sql = getSql();
  if (!sql) {
    if (process.env.VERCEL) {
      throw new Error('DATABASE_URL is required to store covers');
    }
    try {
      fs.mkdirSync(/* turbopackIgnore: true */ LOCAL_DIR, { recursive: true });
      fs.writeFileSync(/* turbopackIgnore: true */ localCoverPath(cid), buffer);
    } catch {
      // ignore
    }
    return coverMediaUrl(cid);
  }

  await ensureCoverTable();
  const b64 = buffer.toString('base64');
  const type = contentType.startsWith('image/') ? contentType : 'image/jpeg';
  await sql`
    INSERT INTO track_covers (cid, bytes, content_type, byte_size, updated_at)
    VALUES (${cid}, decode(${b64}, 'base64'), ${type}, ${buffer.length}, now())
    ON CONFLICT (cid) DO UPDATE
    SET bytes = EXCLUDED.bytes,
        content_type = EXCLUDED.content_type,
        byte_size = EXCLUDED.byte_size,
        updated_at = now()
  `;

  // Best-effort local cache for faster /api/covers in dev.
  try {
    fs.mkdirSync(/* turbopackIgnore: true */ LOCAL_DIR, { recursive: true });
    fs.writeFileSync(/* turbopackIgnore: true */ localCoverPath(cid), buffer);
  } catch {
    // ignore
  }

  return coverMediaUrl(cid);
}

export async function deleteCover(cid: string): Promise<void> {
  const sql = getSql();
  if (sql) {
    try {
      await sql`DELETE FROM track_covers WHERE cid = ${cid}`;
    } catch (err) {
      console.warn('[coverStorage] neon delete failed', err);
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

export async function readCover(
  cid: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sql = getSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT bytes, content_type FROM track_covers WHERE cid = ${cid} LIMIT 1
      `;
      const row = rows[0];
      if (row) {
        const buffer = toBuffer(row.bytes);
        if (buffer?.length) {
          return {
            buffer,
            contentType:
              typeof row.content_type === 'string' ? row.content_type : 'image/jpeg',
          };
        }
      }
    } catch (err) {
      console.warn('[coverStorage] neon read failed', err);
    }
  }

  const local = readLocalCover(cid);
  if (!local?.length) return null;
  return { buffer: local, contentType: 'image/jpeg' };
}

export function readLocalCover(cid: string): Buffer | null {
  const file = localCoverPath(cid);
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return null;
  return fs.readFileSync(/* turbopackIgnore: true */ file);
}
