import { neon } from '@neondatabase/serverless';
import { AVATAR_MAX_BYTES } from '@/lib/mediaLimits';

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
  return null;
}

export function artistAvatarUrl(userId: string) {
  return `/api/artists/avatar/${encodeURIComponent(userId)}`;
}

export async function storeArtistAvatar(
  userId: string,
  bytes: ArrayBuffer | Buffer,
  contentType = 'image/jpeg',
): Promise<string> {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new Error('avatar_too_large');
  }
  if (!contentType.startsWith('image/')) {
    throw new Error('image_only');
  }

  const sql = getSql();
  if (!sql) throw new Error('DATABASE_URL is not set');

  const b64 = buffer.toString('base64');
  await sql`
    INSERT INTO artist_avatars (user_id, bytes, content_type, byte_size, updated_at)
    VALUES (${userId}, decode(${b64}, 'base64'), ${contentType}, ${buffer.length}, now())
    ON CONFLICT (user_id) DO UPDATE
    SET bytes = EXCLUDED.bytes,
        content_type = EXCLUDED.content_type,
        byte_size = EXCLUDED.byte_size,
        updated_at = now()
  `;

  const url = artistAvatarUrl(userId);
  await sql`
    UPDATE artists SET profile_image_url = ${url} WHERE user_id = ${userId}
  `;
  return url;
}

export async function readArtistAvatar(
  userId: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`
    SELECT bytes, content_type FROM artist_avatars WHERE user_id = ${userId} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const buffer = toBuffer(row.bytes);
  if (!buffer?.length) return null;
  return {
    buffer,
    contentType: typeof row.content_type === 'string' ? row.content_type : 'image/jpeg',
  };
}
