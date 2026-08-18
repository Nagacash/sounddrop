'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { useUIStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
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
    const img = root.querySelector('[data-hero-img]');
    const title = root.querySelector('[data-hero-title]');
    const meta = root.querySelectorAll('[data-hero-meta]');

    const ctx = gsap.context(() => {
      gsap.fromTo(
        img,
        { scale: reduce ? 1 : 1.08, opacity: 0.7 },
        {
          scale: 1,
          opacity: 1,
          duration: reduce ? 0.2 : 1.4,
          ease: 'power2.out',
          overwrite: true,
        },
      );
      gsap.fromTo(
        title,
        { y: reduce ? 0 : 36, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: reduce ? 0.2 : 0.7,
          delay: reduce ? 0 : 0.15,
          ease: 'power3.out',
          overwrite: true,
          clearProps: 'transform',
        },
      );
      gsap.fromTo(
        meta,
        { y: reduce ? 0 : 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: reduce ? 0.2 : 0.55,
          stagger: reduce ? 0 : 0.06,
          delay: reduce ? 0 : 0.28,
          ease: 'power2.out',
          overwrite: true,
          clearProps: 'transform,opacity',
        },
      );
    }, root);

    return () => ctx.revert();
  }, [artist.publicKeyHash]);

  return (
    <header ref={rootRef} className="relative min-h-[100dvh] w-full overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div data-hero-img className="absolute inset-0 will-change-transform">
          <Image
            src={artist.profileImageUrl}
            alt={artist.displayName}
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-sd-bg via-sd-bg/55 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-sd-bg/80 via-transparent to-transparent" />
        <div
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-sd-bg to-transparent"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-5 pb-16 pt-24 sm:px-10 sm:pb-20 lg:px-16">
        <div className="max-w-5xl">
          <p
            data-hero-meta
            className="mb-4 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-sd-text"
          >
            <span className="inline-flex items-center gap-2">
              <VerifiedMark />
              <span>Artist-owned · Ed25519 signed</span>
            </span>
            {artist.location ? (
              <span className="text-white/55">· {artist.location}</span>
            ) : null}
          </p>

          <h1
            data-hero-title
            className="font-display text-[clamp(3.5rem,14vw,9rem)] leading-[0.85] tracking-[-0.05em] text-white"
          >
            {artist.displayName}
          </h1>

          <p
            data-hero-meta
            className="text-pretty mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg"
          >
            {artist.bio}
          </p>

          <p data-hero-meta className="mt-5 font-telemetry text-[11px] tracking-widest text-white/50">
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
                className="inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center gap-2 bg-sd-accent px-7 text-sm font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-[#ff2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                aria-label={playingFirst ? 'Pause' : 'Play'}
              >
                {playingFirst ? <PauseIcon /> : <PlayIcon />}
                {playingFirst ? 'Pause' : 'Play'}
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleFollowArtist(artist.publicKeyHash)}
              className={`inline-flex min-h-12 cursor-pointer items-center justify-center border px-7 text-sm font-bold uppercase tracking-[0.08em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent ${
                following
                  ? 'border-white bg-white text-black hover:bg-transparent hover:text-white'
                  : 'border-white/40 bg-transparent text-white hover:border-white'
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
