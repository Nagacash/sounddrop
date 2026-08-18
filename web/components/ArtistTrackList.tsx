'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
  artworkUrl?: string;
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
  artworkUrl,
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
        { opacity: 0 },
        {
          opacity: 1,
          duration: reduce ? 0.12 : 0.35,
          stagger: reduce ? 0 : 0.04,
          ease: 'power2.out',
          overwrite: true,
          clearProps: 'opacity',
        },
      );
    }, root);
    return () => ctx.revert();
  }, [publicKeyHash, tracks.length]);

  return (
    <section className="relative bg-sd-bg px-5 pb-10 pt-12 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-end justify-between gap-4 border-b border-sd-border pb-4">
          <div>
            <p className="font-telemetry text-xs text-sd-muted">[ DISCOGRAPHY ]</p>
            <h2 className="font-display mt-2 text-2xl text-white sm:text-3xl">Tracks</h2>
          </div>
          <p className="font-telemetry text-xs tabular-nums text-white/45">
            {tracks.length.toString().padStart(2, '0')} RELEASES
          </p>
        </div>

        <div ref={listRef} className="border border-sd-border bg-sd-border">
          {tracks.map((track, index) => {
            const active = currentTrack?.id === track.id;
            const playing = active && isPlaying;
            const shareUrl = trackShareUrl(slug || publicKeyHash, track.id);

            return (
              <div
                key={track.id}
                data-track-row
                className={`group grid min-h-[72px] grid-cols-[44px_48px_1fr_auto] items-center gap-2 bg-sd-surface px-2 py-2.5 transition-colors duration-fast ease-out hover:bg-sd-surface-hover sm:grid-cols-[48px_56px_1fr_auto_auto_72px] sm:gap-3 sm:px-3 ${
                  active ? 'bg-sd-surface-hover' : ''
                } border-b border-sd-border last:border-b-0`}
              >
                <button
                  type="button"
                  onClick={() => playTrack({ ...track, artistName, publicKeyHash })}
                  className="relative flex h-11 w-11 cursor-pointer items-center justify-center text-sm text-white/35 transition-colors duration-fast hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
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
                      <span className="tabular-nums group-hover:hidden">{index + 1}</span>
                      <span className="hidden group-hover:inline">
                        <PlayIcon />
                      </span>
                    </>
                  )}
                </button>

                <div className="relative h-12 w-12 shrink-0 overflow-hidden border border-sd-border sm:h-14 sm:w-14">
                  {artworkUrl ? (
                    <Image
                      src={artworkUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <div className="h-full w-full bg-sd-border" />
                  )}
                  {playing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-sd-bg/55">
                      <span className="h-2 w-2 animate-pulse bg-sd-accent" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => playTrack({ ...track, artistName, publicKeyHash })}
                  className="min-w-0 cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                >
                  <p
                    className={`truncate text-sm font-semibold sm:text-base ${
                      active ? 'text-sd-accent' : 'text-white'
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-white/45">
                    {artistName}
                    {track.featuring ? ` feat. ${track.featuring}` : ''}
                    {track.producers ? ` · prod. ${track.producers}` : ''}
                  </p>
                </button>

                <span className="hidden font-telemetry text-[0.6875rem] text-sd-status sm:inline">
                  {track.verified ? 'SIGNED' : '—'}
                  {track.isFree ? ' · FREE' : ''}
                </span>

                <div className="flex items-center gap-1 sm:gap-1">
                  <div className="hidden sm:block">
                    <ShareAction
                      url={shareUrl}
                      title={`${track.title} — ${artistName}`}
                      text={`Play ${track.title} by ${artistName} on SoundDrop.`}
                      label="Share"
                      compact
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setDownloadTrack(track)}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center px-2 text-sm text-white/55 transition-colors duration-fast ease-out hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                  >
                    {track.isFree ? 'Get' : formatPriceCents(track.minPriceCents ?? 0)}
                  </button>
                </div>

                <p className="hidden text-right text-xs tabular-nums text-white/40 sm:block sm:text-sm">
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
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="text-sd-accent"
    >
      <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
    </svg>
  );
}
