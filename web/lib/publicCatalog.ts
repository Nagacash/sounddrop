import { listArtists, listTracks, type Artist as DbArtist, type Track as DbTrack } from '@/lib/db';
import { hashPublicKey } from '@/lib/publicKeyHash';
import { artistSlug } from '@/lib/slug';
import {
  getAllArtists as getMockArtists,
  getArtistByHash as getMockArtistByHash,
  searchArtists as searchMockArtists,
} from '@/lib/mockData';
import { isMvpMockMode } from '@/lib/mockMode';
import type { Artist, Track } from '@/stores/artistStore';

const DEFAULT_PROFILE_IMAGE =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1600&h=1000&fit=crop&q=80';

function mapDbTrack(t: DbTrack): Track {
  return {
    id: t.id,
    cid: t.cid,
    title: t.title || t.name.replace(/\.mp3$/i, ''),
    name: t.name,
    duration: 0,
    isFree: true,
    storageUrl: t.storage_url || `/api/media/${encodeURIComponent(t.cid)}`,
    verified: true,
    createdAt: t.created_at,
  };
}

async function toPublicArtist(
  artist: DbArtist,
  tracksByArtist: Map<string, DbTrack[]>,
  takenSlugs: Set<string>,
): Promise<Artist | null> {
  let publicKeyHash: string;
  try {
    publicKeyHash = await hashPublicKey(artist.public_key);
  } catch {
    return null;
  }

  const tracks = (tracksByArtist.get(artist.user_id) || []).map(mapDbTrack);
  const displayName = artist.display_name?.trim() || 'Artist';
  const slug =
    artist.slug ||
    artistSlug(displayName, publicKeyHash, takenSlugs);

  if (artist.slug) takenSlugs.add(artist.slug);

  return {
    slug,
    publicKeyHash,
    displayName,
    bio: 'Artist-owned sound. Cryptographically verified.',
    profileImageUrl: DEFAULT_PROFILE_IMAGE,
    followerCount: 0,
    totalDownloads: 0,
    tracks,
  };
}

async function loadDbArtists(): Promise<Artist[]> {
  const [artists, tracks] = await Promise.all([
    listArtists(),
    listTracks({ includeRemoved: false }),
  ]);

  const tracksByArtist = new Map<string, DbTrack[]>();
  for (const t of tracks) {
    const list = tracksByArtist.get(t.artist_id) || [];
    list.push(t);
    tracksByArtist.set(t.artist_id, list);
  }

  const taken = new Set<string>();
  const mapped = await Promise.all(
    artists.map((a) => toPublicArtist(a, tracksByArtist, taken)),
  );
  return mapped.filter((a): a is Artist => Boolean(a));
}

function matchesQuery(artist: Artist, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    artist.displayName.toLowerCase().includes(needle) ||
    artist.slug.toLowerCase().includes(needle) ||
    artist.bio.toLowerCase().includes(needle) ||
    artist.publicKeyHash.toLowerCase().includes(needle)
  );
}

function matchesSlugOrHash(artist: Artist, key: string): boolean {
  const k = key.toLowerCase();
  return artist.slug.toLowerCase() === k || artist.publicKeyHash.toLowerCase() === k;
}

/** Public catalog: Neon artists when DATABASE_URL is set; mock demos otherwise / in MVP mock. */
export async function listPublicArtists(query = ''): Promise<Artist[]> {
  if (isMvpMockMode() || !process.env.DATABASE_URL) {
    return query.trim() ? searchMockArtists(query) : getMockArtists();
  }

  const artists = await loadDbArtists();
  return artists.filter((a) => matchesQuery(a, query));
}

export async function getPublicArtist(slugOrHash: string): Promise<Artist | null> {
  if (!slugOrHash) return null;

  if (isMvpMockMode() || !process.env.DATABASE_URL) {
    return getMockArtistByHash(slugOrHash) || null;
  }

  const artists = await loadDbArtists();
  const hit = artists.find((a) => matchesSlugOrHash(a, slugOrHash));
  if (hit) return hit;

  return getMockArtistByHash(slugOrHash) || null;
}

export async function getPublicTrack(
  slugOrHash: string,
  trackId: string,
): Promise<{ artist: Artist; track: Track } | null> {
  const artist = await getPublicArtist(slugOrHash);
  if (!artist) return null;
  const track = artist.tracks.find((t) => t.id === trackId);
  if (!track) return null;
  return { artist, track };
}
