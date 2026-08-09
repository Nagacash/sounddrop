import type { Artist, Track } from '@/stores/artistStore';

export const mockArtists: Record<string, Artist> = {
  'alex-luna': {
    slug: 'alex-luna',
    publicKeyHash: 'artist-001',
    displayName: 'Alex Luna',
    bio: 'Electronic music producer from Berlin. Owner of my sound.',
    profileImageUrl:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1600&h=1000&fit=crop&q=80',
    followerCount: 1234,
    totalDownloads: 5678,
    links: {
      website: 'https://example.com/alex-luna',
      spotify: 'https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF',
      instagram: 'https://instagram.com/alexluna',
    },
    tracks: [
      {
        id: 'track-001',
        cid: 'QmXxxx001',
        title: 'Midnight Vibes',
        name: 'midnight-vibes.mp3',
        duration: 214,
        isFree: true,
        storageUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        verified: true,
        createdAt: '2026-08-09T12:00:00Z',
      },
      {
        id: 'track-002',
        cid: 'QmYyyy002',
        title: 'Electric Dreams',
        name: 'electric-dreams.mp3',
        duration: 256,
        isFree: false,
        minPriceCents: 150,
        storageUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        verified: true,
        createdAt: '2026-08-08T14:30:00Z',
      },
      {
        id: 'track-003',
        cid: 'QmZzzz003',
        title: 'Neon City',
        name: 'neon-city.mp3',
        duration: 192,
        isFree: false,
        minPriceCents: 300,
        storageUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
        verified: true,
        createdAt: '2026-08-07T18:00:00Z',
      },
    ],
  },
  'maya-beats': {
    slug: 'maya-beats',
    publicKeyHash: 'artist-002',
    displayName: 'Maya Beats',
    bio: 'Hip-hop & soul. Independent. DM for collabs.',
    profileImageUrl:
      'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=1600&h=1000&fit=crop&q=80',
    followerCount: 2345,
    totalDownloads: 9876,
    links: {
      website: 'https://example.com/maya-beats',
      spotify: 'https://open.spotify.com/artist/1Xyo4u8uXC1ZmMpatF05PJ',
      instagram: 'https://instagram.com/mayabeats',
    },
    tracks: [
      {
        id: 'track-004',
        cid: 'QmAaaa004',
        title: 'Sunrise',
        name: 'sunrise.mp3',
        duration: 228,
        isFree: true,
        storageUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
        verified: true,
        createdAt: '2026-08-09T10:00:00Z',
      },
      {
        id: 'track-005',
        cid: 'QmBbbb005',
        title: 'Golden Hour',
        name: 'golden-hour.mp3',
        duration: 210,
        isFree: false,
        minPriceCents: 200,
        storageUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
        verified: true,
        createdAt: '2026-08-08T16:45:00Z',
      },
    ],
  },
  'jordan-sky': {
    slug: 'jordan-sky',
    publicKeyHash: 'artist-003',
    displayName: 'Jordan Sky',
    bio: 'Ambient & experimental. Creating the future.',
    profileImageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&h=1000&fit=crop&q=80',
    followerCount: 3456,
    totalDownloads: 12345,
    links: {
      website: 'https://example.com/jordan-sky',
      spotify: 'https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsgXVPf',
      instagram: 'https://instagram.com/jordansky',
    },
    tracks: [
      {
        id: 'track-006',
        cid: 'QmCccc006',
        title: 'Deep Space',
        name: 'deep-space.mp3',
        duration: 305,
        isFree: false,
        minPriceCents: 250,
        storageUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
        verified: true,
        createdAt: '2026-08-09T08:30:00Z',
      },
    ],
  },
};

export const getArtistByHash = (hash: string) => {
  if (mockArtists[hash]) return mockArtists[hash];
  return Object.values(mockArtists).find(
    (a) => a.publicKeyHash === hash || a.slug === hash,
  );
};
export const getAllArtists = () => Object.values(mockArtists);
export const getTrackById = (id: string) => {
  for (const a of Object.values(mockArtists)) {
    const t = a.tracks.find((tr) => tr.id === id);
    if (t) return t;
  }
  return undefined;
};
export const getTrackByArtistAndId = (hash: string, id: string) =>
  getArtistByHash(hash)?.tracks.find((t) => t.id === id);
export const getRecentTracks = (limit = 10): Track[] =>
  Object.values(mockArtists)
    .flatMap((a) => a.tracks)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
export const searchArtists = (q: string) =>
  Object.values(mockArtists).filter(
    (a) =>
      a.displayName.toLowerCase().includes(q.toLowerCase()) ||
      a.slug.toLowerCase().includes(q.toLowerCase()) ||
      a.bio.toLowerCase().includes(q.toLowerCase()),
  );