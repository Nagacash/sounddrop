import { create } from 'zustand';

export interface Track {
  id: string;
  cid: string;
  title: string;
  name: string;
  duration: number;
  isFree: boolean;
  minPriceCents?: number;
  storageUrl: string;
  /** Square track artwork URL (not profile avatar). */
  coverUrl?: string;
  verified: boolean;
  createdAt: string;
  producers?: string;
  featuring?: string;
}

export interface ArtistLinks {
  website?: string;
  spotify?: string;
  instagram?: string;
  bandcamp?: string;
}

export interface Artist {
  /** Vanity path segment for /artist/{slug} */
  slug: string;
  /** Stable Ed25519 key fingerprint (also accepted in old URLs) */
  publicKeyHash: string;
  displayName: string;
  bio: string;
  /** Optional city / region line (e.g. "Berlin") */
  location?: string;
  profileImageUrl: string;
  tracks: Track[];
  followerCount: number;
  totalDownloads: number;
  /** Count of cryptographically signed releases on this space */
  signedReleaseCount?: number;
  links?: ArtistLinks;
}

export interface ArtistState {
  artists: Record<string, Artist>;
  currentArtist: Artist | null;
  currentTrack: Track | null;
  setArtist: (hash: string, artist: Artist) => void;
  getArtist: (hash: string) => Artist | undefined;
  setCurrentArtist: (artist: Artist | null) => void;
  setCurrentTrack: (track: Track | null) => void;
  getArtistTracks: (hash: string) => Track[];
  getTrackById: (trackId: string) => Track | undefined;
}

export const useArtistStore = create<ArtistState>((set, get) => ({
  artists: {},
  currentArtist: null,
  currentTrack: null,
  setArtist: (hash, artist) =>
    set((s) => ({ artists: { ...s.artists, [hash]: artist } })),
  getArtist: (hash) => get().artists[hash],
  setCurrentArtist: (artist) => set({ currentArtist: artist }),
  setCurrentTrack: (track) => set({ currentTrack: track }),
  getArtistTracks: (hash) => get().artists[hash]?.tracks ?? [],
  getTrackById: (trackId) => {
    for (const artist of Object.values(get().artists)) {
      const t = artist.tracks.find((tr) => tr.id === trackId);
      if (t) return t;
    }
    return undefined;
  },
}));
