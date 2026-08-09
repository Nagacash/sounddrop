import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '@/stores/artistStore';

export type PlayerTrack = Track & {
  artistName: string;
  publicKeyHash: string;
};

export interface PlayerState {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playTrack: (track: PlayerTrack) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  reset: () => void;
  /** @deprecated use playTrack */
  setCurrentTrack: (trackId: string) => void;
  currentTrackId: string | null;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      currentTrackId: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      playTrack: (track) => {
        const current = get().currentTrack;
        if (current?.id === track.id) {
          set({ isPlaying: !get().isPlaying });
          return;
        }
        set({
          currentTrack: track,
          currentTrackId: track.id,
          isPlaying: true,
          currentTime: 0,
          duration: track.duration || 0,
        });
      },
      togglePlay: () => {
        if (!get().currentTrack) return;
        set((s) => ({ isPlaying: !s.isPlaying }));
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setCurrentTime: (time) => set({ currentTime: time }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      setCurrentTrack: (trackId) =>
        set({ currentTrackId: trackId, currentTime: 0 }),
      reset: () =>
        set({
          currentTrack: null,
          currentTrackId: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        }),
    }),
    {
      name: 'sounddrop-player',
      partialize: (s) => ({ volume: s.volume, isMuted: s.isMuted }),
    },
  ),
);
