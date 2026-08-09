'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { formatPriceCents, formatTime, trackShareUrl } from '@/lib/utils';
import { usePlayerStore } from '@/stores/playerStore';
import DownloadModal from '@/components/DownloadModal';
import ShareAction from '@/components/ShareAction';
import type { Track } from '@/stores/artistStore';

interface ArtistTrackListProps {
  tracks: Track[];
  slug: string;
  publicKeyHash: string;
  artistName: string;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ArtistTrackList({
  tracks,
  slug,
  publicKeyHash,
  artistName,
}: ArtistTrackListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const { currentTrack, isPlaying, playTrack } = usePlayerStore();
  const [downloadTrack, setDownloadTrack] = useState<Track | null>(null);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const reduce = prefersReducedMotion();
    const rows = root.querySelectorAll('[data-track-row]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        rows,
        { y: reduce ? 0 : 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: reduce ? 0.15 : 0.45,
          stagger: reduce ? 0 : 0.05,
          ease: 'power2.out',
          overwrite: true,
          clearProps: 'transform,opacity',
        },
      );
    }, root);
    return () => ctx.revert();
  }, [publicKeyHash, tracks.length]);

  return (
    <section className="relative bg-sd-bg px-5 pb-28 pt-10 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-white/10 pb-4">
          <h2 className="font-display text-2xl text-white sm:text-3xl">Discography</h2>
          <p className="text-sm text-white/45">{tracks.length} tracks</p>
        </div>

        <div ref={listRef} className="flex flex-col">
          {tracks.map((track, index) => {
            const active = currentTrack?.id === track.id;
            const playing = active && isPlaying;
            const shareUrl = trackShareUrl(slug || publicKeyHash, track.id);

            return (
              <div
                key={track.id}
                data-track-row
                className="group grid min-h-[72px] grid-cols-[40px_1fr_auto] items-center gap-2 border-b border-white/[0.06] px-2 py-3 transition-colors duration-200 hover:bg-white/[0.04] sm:grid-cols-[48px_1fr_auto_auto_88px] sm:gap-3 sm:px-3"
              >
                <button
                  type="button"
                  onClick={() =>
                    playTrack({ ...track, artistName, publicKeyHash })
                  }
                  className="relative flex h-11 w-11 cursor-pointer items-center justify-center text-sm text-white/35 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                  aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
                >
                  {playing ? (
                    <PauseIcon />
                  ) : active ? (
                    <span className="text-sd-accent">
                      <PlayIcon />
                    </span>
                  ) : (
                    <>
                      <span className="group-hover:hidden">{index + 1}</span>
                      <span className="hidden group-hover:inline">
                        <PlayIcon />
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    playTrack({ ...track, artistName, publicKeyHash })
                  }
                  className="min-w-0 cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                >
                  <p
                    className={`truncate text-base font-semibold sm:text-lg ${
                      active ? 'text-sd-accent' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/45">
                    {artistName}
                    {track.verified ? ' · Signed & verified' : ''}
                  </p>
                </button>

                <ShareAction
                  url={shareUrl}
                  title={`${track.title} — ${artistName}`}
                  text={`Play ${track.title} by ${artistName} on SoundDrop.`}
                  label="Share"
                  compact
                />

                <button
                  type="button"
                  onClick={() => setDownloadTrack(track)}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center px-3 text-sm text-white/55 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                >
                  {track.isFree ? 'Download' : formatPriceCents(track.minPriceCents ?? 0)}
                </button>

                <p className="hidden text-right text-sm tabular-nums text-white/40 sm:block">
                  {formatTime(track.duration)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {downloadTrack && (
        <DownloadModal
          track={downloadTrack}
          artistName={artistName}
          open
          onClose={() => setDownloadTrack(null)}
        />
      )}
    </section>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden className="text-sd-accent">
      <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
    </svg>
  );
}
