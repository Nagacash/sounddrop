import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UIState {
  theme: 'dark' | 'light';
  showShareModal: boolean;
  shareTrackId: string | null;
  followedArtists: string[];
  recentSearches: string[];
  toggleTheme: () => void;
  openShareModal: (trackId: string) => void;
  closeShareModal: () => void;
  toggleFollowArtist: (publicKeyHash: string) => void;
  isFollowing: (publicKeyHash: string) => boolean;
  addRecentSearch: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      showShareModal: false,
      shareTrackId: null,
      followedArtists: [],
      recentSearches: [],
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      openShareModal: (trackId) => set({ showShareModal: true, shareTrackId: trackId }),
      closeShareModal: () => set({ showShareModal: false, shareTrackId: null }),
      toggleFollowArtist: (hash) =>
        set((s) => ({
          followedArtists: s.followedArtists.includes(hash)
            ? s.followedArtists.filter((h) => h !== hash)
            : [...s.followedArtists, hash],
        })),
      isFollowing: (hash) => get().followedArtists.includes(hash),
      addRecentSearch: (query) =>
        set((s) => ({
          recentSearches: [query, ...s.recentSearches.filter((q) => q !== query)].slice(0, 10),
        })),
    }),
    { name: 'sounddrop-ui' },
  ),
);
