'use client';

import { useState } from 'react';
import { formatPriceCents, formatTime, trackShareUrl } from '@/lib/utils';
import { usePlayerStore } from '@/stores/playerStore';
import DownloadModal from '@/components/DownloadModal';
import ShareAction from '@/components/ShareAction';
import type { Track } from '@/stores/artistStore';

interface TrackCardProps {
  track: Track;
  publicKeyHash: string;
  artistName: string;
}

export default function TrackCard({ track, publicKeyHash, artistName }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayerStore();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const playing = currentTrack?.id === track.id && isPlaying;

  return (
    <div className="sd-panel border border-sd-border bg-sd-surface p-4">
      <button
        type="button"
        onClick={() => playTrack({ ...track, artistName, publicKeyHash })}
        className="block w-full cursor-pointer text-left"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display truncate text-lg text-sd-text">{track.title}</h3>
            <p className="font-telemetry mt-1 truncate text-xs text-sd-muted">{artistName}</p>
          </div>
          {track.verified && <span className="sd-badge-verified shrink-0">VERIFIED</span>}
        </div>
        <p className="font-telemetry text-xs text-sd-muted">
          {formatTime(track.duration)} · {playing ? 'PLAYING' : 'TAP TO PLAY'}
        </p>
      </button>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-sd-border pt-3">
        <ShareAction
          url={trackShareUrl(publicKeyHash, track.id)}
          title={`${track.title} — ${artistName}`}
          text={`Play ${track.title} by ${artistName} on SoundDrop.`}
          label="Share"
          compact
        />
        <button
          type="button"
          onClick={() => setDownloadOpen(true)}
          className="font-telemetry inline-flex min-h-11 cursor-pointer items-center text-xs text-sd-muted transition-colors duration-fast hover:text-sd-accent"
        >
          {track.isFree ? 'Download' : `Download from ${formatPriceCents(track.minPriceCents ?? 0)}`}
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
