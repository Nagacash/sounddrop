'use client';

import { useEffect, useRef } from 'react';
import { formatPriceCents } from '@/lib/utils';
import { animateModalClose, animateModalOpen } from '@/lib/animations';
import type { Track } from '@/stores/artistStore';

interface DownloadModalProps {
  track: Track;
  artistName: string;
  open: boolean;
  onClose: () => void;
}

export default function DownloadModal({ track, artistName, open, onClose }: DownloadModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && panelRef.current) animateModalOpen(panelRef.current);
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (panelRef.current) {
      animateModalClose(panelRef.current, onClose);
    } else {
      onClose();
    }
  };

  const handleDownload = () => {
    // Free downloads open now. Paid / name-your-price gates land with payments.
    const a = document.createElement('a');
    a.href = track.storageUrl;
    a.download = track.name || `${track.title}.mp3`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
    close();
  };

  const paid = !track.isFree;
  const floor = formatPriceCents(track.minPriceCents ?? 0);

  return (
    <div
      className="fixed inset-0 z-toast flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-title"
      onClick={close}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md border border-white/15 bg-sd-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs uppercase tracking-[0.14em] text-white/45">
          {paid ? 'Support download' : 'Free download'}
        </p>
        <h2 id="download-title" className="font-display mt-2 text-2xl text-white">
          {track.title}
        </h2>
        <p className="mt-1 text-sm text-white/55">{artistName}</p>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          {paid
            ? `Name your price from ${floor}. Payment goes to the artist — SoundDrop is the signed space, not the middleman catalog.`
            : 'Free file from an artist-owned, cryptographically signed release. Share the space if you want to support.'}
        </p>
        {paid && (
          <p className="mt-3 font-telemetry text-[10px] tracking-widest text-white/40">
            [ PAYMENTS COMING — DOWNLOAD UNLOCKED FOR NOW ]
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center bg-sd-accent px-6 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-[#ff2a2a]"
          >
            {paid ? 'Download' : 'Download free'}
          </button>
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center border border-white/25 px-6 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:border-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
