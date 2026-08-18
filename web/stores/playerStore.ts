import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Track } from '@/stores/artistStore';

export type PlayerTrack = Track & {
  artistName: string;
  publicKeyHash: string;
};

export interface PlayerState {
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  /** Play one track. Pass `queue` to set a full listening list (discography / playlist). */
  playTrack: (track: PlayerTrack, opts?: { queue?: PlayerTrack[] }) => void;
  playQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  playNext: () => void;
  playPrev: () => void;
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
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      playTrack: (track, opts) => {
        const current = get().currentTrack;
        const incomingQueue = opts?.queue;

        if (incomingQueue && incomingQueue.length > 0) {
          const idx = Math.max(
            0,
            incomingQueue.findIndex((t) => t.id === track.id),
          );
          set({
            queue: incomingQueue,
            queueIndex: idx,
            currentTrack: incomingQueue[idx] || track,
            currentTrackId: (incomingQueue[idx] || track).id,
            isPlaying: true,
            currentTime: 0,
            duration: (incomingQueue[idx] || track).duration || 0,
          });
          return;
        }

        if (current?.id === track.id) {
          set({ isPlaying: !get().isPlaying });
          return;
        }

        const queue = get().queue;
        const idx = queue.findIndex((t) => t.id === track.id);
        set({
          currentTrack: track,
          currentTrackId: track.id,
          queueIndex: idx >= 0 ? idx : -1,
          isPlaying: true,
          currentTime: 0,
          duration: track.duration || 0,
        });
      },
      playQueue: (tracks, startIndex = 0) => {
        if (!tracks.length) return;
        const idx = Math.min(Math.max(0, startIndex), tracks.length - 1);
        const track = tracks[idx];
        set({
          queue: tracks,
          queueIndex: idx,
          currentTrack: track,
          currentTrackId: track.id,
          isPlaying: true,
          currentTime: 0,
          duration: track.duration || 0,
        });
      },
      playNext: () => {
        const { queue, queueIndex } = get();
        if (!queue.length || queueIndex < 0) {
          set({ isPlaying: false });
          return;
        }
        const next = queueIndex + 1;
        if (next >= queue.length) {
          set({ isPlaying: false });
          return;
        }
        const track = queue[next];
        set({
          queueIndex: next,
          currentTrack: track,
          currentTrackId: track.id,
          isPlaying: true,
          currentTime: 0,
          duration: track.duration || 0,
        });
      },
      playPrev: () => {
        const { queue, queueIndex, currentTime } = get();
        if (currentTime > 3) {
          set({ currentTime: 0 });
          return;
        }
        if (!queue.length || queueIndex <= 0) {
          set({ currentTime: 0 });
          return;
        }
        const prev = queueIndex - 1;
        const track = queue[prev];
        set({
          queueIndex: prev,
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
          queue: [],
          queueIndex: -1,
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
