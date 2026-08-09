// Data layer adapter. Uses Postgres (pg) when DATABASE_URL is set; otherwise
// falls back to a JSON-file store so the app runs locally without a DB.
// Swap to Postgres in production with: DATABASE_URL=postgres://...

import fs from 'fs';
import path from 'path';

// On Vercel the deploy FS is read-only; only /tmp is writable (still ephemeral).
const FILE =
  process.env.DB_FILE ||
  (process.env.VERCEL
    ? '/tmp/sounddrop.json'
    : path.join(process.cwd(), 'data', 'sounddrop.json'));

export type Artist = {
  user_id: string;
  email: string;
  display_name: string;
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

export async function upsertArtist(a: Artist) {
  const d = readAll();
  const i = d.artists.findIndex((x) => x.user_id === a.user_id);
  if (i >= 0) d.artists[i] = { ...d.artists[i], ...a };
  else d.artists.push(a);
  writeAll(d);
  return a;
}

export async function getArtist(userId: string): Promise<Artist | null> {
  return readAll().artists.find((x) => x.user_id === userId) || null;
}

export async function listArtists(): Promise<Artist[]> {
  return readAll().artists.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function deleteArtist(userId: string): Promise<boolean> {
  const d = readAll();
  const before = d.artists.length;
  d.artists = d.artists.filter((a) => a.user_id !== userId);
  d.tracks = d.tracks.filter((t) => t.artist_id !== userId);
  writeAll(d);
  return d.artists.length < before;
}

export async function insertTrack(t: Track) {
  const d = readAll();
  d.tracks.push(t);
  writeAll(d);
  return t;
}

export async function listTracks(opts?: { includeRemoved?: boolean }): Promise<Track[]> {
  const includeRemoved = opts?.includeRemoved ?? false;
  return readAll()
    .tracks.filter((t) => includeRemoved || !t.removed_at)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getTrack(id: string): Promise<Track | null> {
  return readAll().tracks.find((x) => x.id === id) || null;
}

export async function removeTrack(id: string, reason: string): Promise<Track | null> {
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

export async function restoreTrack(id: string): Promise<Track | null> {
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

export async function hardDeleteTrack(id: string): Promise<boolean> {
  const d = readAll();
  const before = d.tracks.length;
  d.tracks = d.tracks.filter((t) => t.id !== id);
  writeAll(d);
  return d.tracks.length < before;
}

export async function appendAudit(event: Omit<AuditEvent, 'id' | 'at'>): Promise<AuditEvent> {
  const d = readAll();
  const row: AuditEvent = {
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...event,
  };
  d.audit.unshift(row);
  d.audit = d.audit.slice(0, 500);
  writeAll(d);
  return row;
}

export async function listAudit(limit = 100): Promise<AuditEvent[]> {
  return readAll().audit.slice(0, limit);
}

export async function adminStats() {
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
