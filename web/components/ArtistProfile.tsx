'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import ArtistAvatar from '@/components/ArtistAvatar';
import ArtistSocialLinks from '@/components/ArtistSocialLinks';
import ShareAction from '@/components/ShareAction';
import { artistShareUrl } from '@/lib/utils';
import type { Artist } from '@/stores/artistStore';

interface ArtistProfileProps {
  artist: Artist;
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ArtistProfile({ artist }: ArtistProfileProps) {
  const rootRef = useRef<HTMLElement>(null);
  const { toggleFollowArtist, isFollowing } = useUIStore();
  const { currentTrack, isPlaying, playTrack } = usePlayerStore();
  const following = isFollowing(artist.publicKeyHash);
  const firstTrack = artist.tracks[0];
  const playingFirst =
    !!firstTrack && currentTrack?.id === firstTrack.id && isPlaying;
  const signedCount =
    artist.signedReleaseCount ?? artist.tracks.filter((t) => t.verified).length;
  const keyShort = artist.publicKeyHash.slice(0, 8);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduce = prefersReducedMotion();
    const title = root.querySelector('[data-hero-title]');
    const meta = root.querySelectorAll('[data-hero-meta]');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        title,
        { y: reduce ? 0 : 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: reduce ? 0.2 : 0.65,
          ease: 'power3.out',
          overwrite: true,
          clearProps: 'transform',
        },
      );
      gsap.fromTo(
        meta,
        { y: reduce ? 0 : 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: reduce ? 0.2 : 0.5,
          stagger: reduce ? 0 : 0.05,
          delay: reduce ? 0 : 0.12,
          ease: 'power2.out',
          overwrite: true,
          clearProps: 'transform,opacity',
        },
      );
    }, root);

    return () => ctx.revert();
  }, [artist.publicKeyHash]);

  return (
    <header
      ref={rootRef}
      className="relative w-full overflow-hidden border-b border-sd-border bg-sd-bg pt-24 sm:pt-28"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--sd-border) 1px, transparent 1px), linear-gradient(to bottom, var(--sd-border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-12 sm:px-10 lg:px-16">
        <div data-hero-meta className="mb-6">
          <ArtistAvatar
            src={artist.profileImageUrl}
            name={artist.displayName}
            size="lg"
            priority
          />
        </div>

        <p
          data-hero-meta
          className="mb-4 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-sd-text"
        >
          <span className="inline-flex items-center gap-2">
            <VerifiedMark />
            <span>Artist-owned · Ed25519 signed</span>
          </span>
          {artist.location ? <span className="text-sd-muted">· {artist.location}</span> : null}
        </p>

        <h1
          data-hero-title
          className="font-display text-[clamp(2.75rem,10vw,5.5rem)] leading-[0.9] tracking-[-0.04em] text-sd-text"
        >
          {artist.displayName}
        </h1>

        <p
          data-hero-meta
          className="text-pretty mt-5 max-w-xl text-base leading-relaxed text-sd-muted sm:text-lg"
        >
          {artist.bio}
        </p>

        <p
          data-hero-meta
          className="mt-5 font-telemetry text-[0.6875rem] tracking-widest text-sd-muted"
        >
          {signedCount} signed release{signedCount === 1 ? '' : 's'}
          {' · '}
          key {keyShort}…
        </p>

        <div data-hero-meta className="mt-6">
          <ArtistSocialLinks links={artist.links} />
        </div>

        <div data-hero-meta className="mt-8 flex flex-wrap items-center gap-3">
          {firstTrack && (
            <button
              type="button"
              onClick={() =>
                playTrack({
                  ...firstTrack,
                  artistName: artist.displayName,
                  publicKeyHash: artist.publicKeyHash,
                })
              }
              className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center gap-2 bg-sd-accent px-7 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-fast ease-out hover:bg-sd-accent-hot focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
              aria-label={playingFirst ? 'Pause' : 'Play'}
            >
              {playingFirst ? <PauseIcon /> : <PlayIcon />}
              {playingFirst ? 'Pause' : 'Play'}
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleFollowArtist(artist.publicKeyHash)}
            className={`inline-flex min-h-12 cursor-pointer items-center justify-center border px-7 text-sm font-bold uppercase tracking-[0.08em] transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent ${
              following
                ? 'border-sd-text bg-sd-text text-sd-bg hover:bg-transparent hover:text-sd-text'
                : 'border-sd-border bg-transparent text-sd-text hover:border-sd-text'
            }`}
          >
            {following ? 'Following' : 'Follow'}
          </button>
          <ShareAction
            url={artistShareUrl(artist.slug || artist.publicKeyHash)}
            title={`${artist.displayName} on SoundDrop`}
            text={`Listen to ${artist.displayName} — artist-owned music on SoundDrop.`}
            label="Share profile"
          />
        </div>
      </div>
    </header>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.14v13.72L19 12 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M7 5h3.5v14H7V5zm6.5 0H17v14h-3.5V5z" />
    </svg>
  );
}

function VerifiedMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#4af626" />
      <path
        d="M7.5 12.5l2.8 2.8 6.2-6.5"
        stroke="#0a0a0a"
        strokeWidth="2.2"
        strokeLinecap="square"
      />
    </svg>
  );
}
