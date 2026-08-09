// Neon Postgres via Drizzle when DATABASE_URL is set.
// Falls back to a JSON file store for offline/local without Neon.

import fs from 'fs';
import path from 'path';
import { desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/lib/db/schema';
import { artists, tracks, auditEvents } from '@/lib/db/schema';
import { artistSlug } from '@/lib/slug';
import { hashPublicKey } from '@/lib/publicKeyHash';

export type Artist = {
  user_id: string;
  email: string;
  display_name: string;
  slug: string;
  public_key: string;
  created_at: string;
};

export type Track = {
  id: string;
  artist_id: string;
  title: string;
  name: string;
  size: number;
  type: string;
  cid: string;
  signature: string;
  public_key: string;
  storage_url: string | null;
  created_at: string;
  removed_at?: string | null;
  removed_reason?: string | null;
};

export type AuditEvent = {
  id: string;
  at: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_type: 'user' | 'track' | 'system';
  target_id: string;
  detail: string;
};

const FILE =
  process.env.DB_FILE ||
  (process.env.VERCEL
    ? '/tmp/sounddrop.json'
    : path.join(process.cwd(), 'data', 'sounddrop.json'));

function useNeon() {
  return Boolean(process.env.DATABASE_URL);
}

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const client = neon(url);
  return drizzle(client, { schema });
}

function iso(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : d;
}

function isoOrNull(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : d;
}

function mapArtist(row: typeof artists.$inferSelect): Artist {
  return {
    user_id: row.user_id,
    email: row.email || '',
    display_name: row.display_name || '',
    slug: row.slug || '',
    public_key: row.public_key,
    created_at: iso(row.created_at),
  };
}

async function resolveSlug(
  userId: string,
  displayName: string,
  publicKey: string,
  existingSlug?: string | null,
): Promise<string> {
  let publicKeyHash: string;
  try {
    publicKeyHash = await hashPublicKey(publicKey);
  } catch {
    publicKeyHash = userId.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'artist';
  }

  // Keep a stable slug when the artist already has one and name didn't force a change.
  if (existingSlug) return existingSlug;

  const taken = new Set<string>();
  if (!useNeon()) {
    for (const a of readAll().artists) {
      if (a.user_id !== userId && a.slug) taken.add(a.slug);
    }
  } else {
    const db = getDb();
    const rows = await db.select({ slug: artists.slug, user_id: artists.user_id }).from(artists);
    for (const r of rows) {
      if (r.user_id !== userId && r.slug) taken.add(r.slug);
    }
  }

  return artistSlug(displayName || 'Artist', publicKeyHash, taken);
}

function mapTrack(row: typeof tracks.$inferSelect): Track {
  return {
    id: row.id,
    artist_id: row.artist_id,
    title: row.title || '',
    name: row.name,
    size: Number(row.size),
    type: row.type,
    cid: row.cid,
    signature: row.signature,
    public_key: row.public_key,
    storage_url: row.storage_url,
    created_at: iso(row.created_at),
    removed_at: isoOrNull(row.removed_at),
    removed_reason: row.removed_reason,
  };
}

function mapAudit(row: typeof auditEvents.$inferSelect): AuditEvent {
  return {
    id: row.id,
    at: iso(row.at),
    admin_id: row.admin_id,
    admin_email: row.admin_email,
    action: row.action,
    target_type: row.target_type as AuditEvent['target_type'],
    target_id: row.target_id,
    detail: row.detail,
  };
}

/* ---------------- JSON fallback ---------------- */

type DbShape = { artists: Artist[]; tracks: Track[]; audit: AuditEvent[] };

function readAll(): DbShape {
  if (!fs.existsSync(/* turbopackIgnore: true */ FILE)) {
    return { artists: [], tracks: [], audit: [] };
  }
  const raw = JSON.parse(
    fs.readFileSync(/* turbopackIgnore: true */ FILE, 'utf8'),
  ) as Partial<DbShape>;
  return {
    artists: raw.artists || [],
    tracks: raw.tracks || [],
    audit: raw.audit || [],
  };
}

function writeAll(data: DbShape) {
  fs.mkdirSync(/* turbopackIgnore: true */ path.dirname(FILE), { recursive: true });
  fs.writeFileSync(/* turbopackIgnore: true */ FILE, JSON.stringify(data, null, 2));
}

/* ---------------- Public API ---------------- */

export async function upsertArtist(a: Omit<Artist, 'slug'> & { slug?: string }) {
  const existing = await getArtist(a.user_id);
  const slug =
    a.slug ||
    (await resolveSlug(a.user_id, a.display_name, a.public_key, existing?.slug || null));
  const row: Artist = { ...a, slug };

  if (!useNeon()) {
    const d = readAll();
    const i = d.artists.findIndex((x) => x.user_id === row.user_id);
    if (i >= 0) d.artists[i] = { ...d.artists[i], ...row };
    else d.artists.push(row);
    writeAll(d);
    return row;
  }

  const db = getDb();
  await db
    .insert(artists)
    .values({
      user_id: row.user_id,
      email: row.email || null,
      display_name: row.display_name || null,
      slug: row.slug,
      public_key: row.public_key,
      created_at: new Date(row.created_at),
    })
    .onConflictDoUpdate({
      target: artists.user_id,
      set: {
        email: row.email || null,
        display_name: row.display_name || null,
        slug: row.slug,
        public_key: row.public_key,
      },
    });
  return row;
}

export async function getArtist(userId: string): Promise<Artist | null> {
  if (!useNeon()) {
    return readAll().artists.find((x) => x.user_id === userId) || null;
  }
  const db = getDb();
  const rows = await db.select().from(artists).where(eq(artists.user_id, userId)).limit(1);
  return rows[0] ? mapArtist(rows[0]) : null;
}

export async function listArtists(): Promise<Artist[]> {
  if (!useNeon()) {
    return readAll().artists.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const db = getDb();
  const rows = await db.select().from(artists).orderBy(desc(artists.created_at));
  return rows.map(mapArtist);
}

export async function deleteArtist(userId: string): Promise<boolean> {
  if (!useNeon()) {
    const d = readAll();
    const before = d.artists.length;
    d.artists = d.artists.filter((a) => a.user_id !== userId);
    d.tracks = d.tracks.filter((t) => t.artist_id !== userId);
    writeAll(d);
    return d.artists.length < before;
  }
  const db = getDb();
  await db.delete(tracks).where(eq(tracks.artist_id, userId));
  const deleted = await db.delete(artists).where(eq(artists.user_id, userId)).returning({
    user_id: artists.user_id,
  });
  return deleted.length > 0;
}

export async function insertTrack(t: Track) {
  if (!useNeon()) {
    const d = readAll();
    const i = d.tracks.findIndex((x) => x.id === t.id);
    if (i >= 0) d.tracks[i] = { ...d.tracks[i], ...t };
    else d.tracks.push(t);
    writeAll(d);
    return t;
  }
  const db = getDb();
  await db
    .insert(tracks)
    .values({
      id: t.id,
      artist_id: t.artist_id,
      title: t.title || null,
      name: t.name,
      size: t.size,
      type: t.type,
      cid: t.cid,
      signature: t.signature,
      public_key: t.public_key,
      storage_url: t.storage_url,
      created_at: new Date(t.created_at),
      removed_at: t.removed_at ? new Date(t.removed_at) : null,
      removed_reason: t.removed_reason ?? null,
    })
    .onConflictDoUpdate({
      target: tracks.id,
      set: {
        title: t.title || null,
        name: t.name,
        size: t.size,
        type: t.type,
        signature: t.signature,
        public_key: t.public_key,
        storage_url: t.storage_url,
        removed_at: null,
        removed_reason: null,
      },
    });
  return t;
}

export async function listTracks(opts?: { includeRemoved?: boolean }): Promise<Track[]> {
  const includeRemoved = opts?.includeRemoved ?? false;
  if (!useNeon()) {
    return readAll()
      .tracks.filter((t) => includeRemoved || !t.removed_at)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const db = getDb();
  const rows = includeRemoved
    ? await db.select().from(tracks).orderBy(desc(tracks.created_at))
    : await db
        .select()
        .from(tracks)
        .where(isNull(tracks.removed_at))
        .orderBy(desc(tracks.created_at));
  return rows.map(mapTrack);
}

export async function getTrack(id: string): Promise<Track | null> {
  if (!useNeon()) {
    return readAll().tracks.find((x) => x.id === id) || null;
  }
  const db = getDb();
  const rows = await db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
  return rows[0] ? mapTrack(rows[0]) : null;
}

export async function removeTrack(id: string, reason: string): Promise<Track | null> {
  if (!useNeon()) {
    const d = readAll();
    const i = d.tracks.findIndex((t) => t.id === id);
    if (i < 0) return null;
    d.tracks[i] = {
      ...d.tracks[i],
      removed_at: new Date().toISOString(),
      removed_reason: reason,
    };
    writeAll(d);
    return d.tracks[i];
  }
  const db = getDb();
  const rows = await db
    .update(tracks)
    .set({ removed_at: new Date(), removed_reason: reason })
    .where(eq(tracks.id, id))
    .returning();
  return rows[0] ? mapTrack(rows[0]) : null;
}

export async function restoreTrack(id: string): Promise<Track | null> {
  if (!useNeon()) {
    const d = readAll();
    const i = d.tracks.findIndex((t) => t.id === id);
    if (i < 0) return null;
    d.tracks[i] = {
      ...d.tracks[i],
      removed_at: null,
      removed_reason: null,
    };
    writeAll(d);
    return d.tracks[i];
  }
  const db = getDb();
  const rows = await db
    .update(tracks)
    .set({ removed_at: null, removed_reason: null })
    .where(eq(tracks.id, id))
    .returning();
  return rows[0] ? mapTrack(rows[0]) : null;
}

export async function hardDeleteTrack(id: string): Promise<boolean> {
  if (!useNeon()) {
    const d = readAll();
    const before = d.tracks.length;
    d.tracks = d.tracks.filter((t) => t.id !== id);
    writeAll(d);
    return d.tracks.length < before;
  }
  const db = getDb();
  const deleted = await db.delete(tracks).where(eq(tracks.id, id)).returning({ id: tracks.id });
  return deleted.length > 0;
}

export async function appendAudit(event: Omit<AuditEvent, 'id' | 'at'>): Promise<AuditEvent> {
  const row: AuditEvent = {
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...event,
  };

  if (!useNeon()) {
    const d = readAll();
    d.audit.unshift(row);
    d.audit = d.audit.slice(0, 500);
    writeAll(d);
    return row;
  }

  const db = getDb();
  await db.insert(auditEvents).values({
    id: row.id,
    at: new Date(row.at),
    admin_id: row.admin_id,
    admin_email: row.admin_email,
    action: row.action,
    target_type: row.target_type,
    target_id: row.target_id,
    detail: row.detail,
  });
  return row;
}

export async function listAudit(limit = 100): Promise<AuditEvent[]> {
  if (!useNeon()) {
    return readAll().audit.slice(0, limit);
  }
  const db = getDb();
  const rows = await db.select().from(auditEvents).orderBy(desc(auditEvents.at)).limit(limit);
  return rows.map(mapAudit);
}

export async function adminStats() {
  if (!useNeon()) {
    const d = readAll();
    const liveTracks = d.tracks.filter((t) => !t.removed_at);
    const removedTracks = d.tracks.filter((t) => !!t.removed_at);
    return {
      artists: d.artists.length,
      tracksLive: liveTracks.length,
      tracksRemoved: removedTracks.length,
      auditEvents: d.audit.length,
    };
  }

  const db = getDb();
  const [artistCount] = await db.select({ n: sql<number>`count(*)::int` }).from(artists);
  const [live] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tracks)
    .where(isNull(tracks.removed_at));
  const [removed] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tracks)
    .where(isNotNull(tracks.removed_at));
  const [auditCount] = await db.select({ n: sql<number>`count(*)::int` }).from(auditEvents);

  return {
    artists: artistCount?.n ?? 0,
    tracksLive: live?.n ?? 0,
    tracksRemoved: removed?.n ?? 0,
    auditEvents: auditCount?.n ?? 0,
  };
}
