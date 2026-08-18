'use client';

import { useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { formatTime } from '@/lib/utils';
import DownloadModal from '@/components/DownloadModal';
import type { Track } from '@/stores/artistStore';

interface MusicPlayerProps {
  track: Track;
  artistName: string;
  publicKeyHash: string;
}

export default function MusicPlayer({ track, artistName, publicKeyHash }: MusicPlayerProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayerStore();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const active = currentTrack?.id === track.id;
  const playing = active && isPlaying;

  return (
    <div className="border border-white/10 bg-sd-surface p-5">
      <h3 className="font-display text-2xl text-white">{track.title}</h3>
      <p className="mt-2 text-sm text-white/55">
        {artistName} · {formatTime(track.duration)}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => playTrack({ ...track, artistName, publicKeyHash })}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 bg-sd-accent px-6 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-sd-accent-hot"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => setDownloadOpen(true)}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center border border-white/25 px-6 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:border-white"
        >
          Download
        </button>
      </div>

      <DownloadModal
        track={track}
        artistName={artistName}
        open={downloadOpen}
        onClose={() => setDownloadOpen(false)}
      />
    </div>
  );
}
