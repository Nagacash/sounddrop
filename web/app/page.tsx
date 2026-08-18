'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUIStore } from '@/stores/uiStore';
import TrendingTracks, { flattenDiscoverTracks } from '@/components/TrendingTracks';
import type { Artist } from '@/stores/artistStore';

export default function Home() {
  const [query, setQuery] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { addRecentSearch, recentSearches } = useUIStore();

  useEffect(() => {
    const controller = new AbortController();
    const q = query.trim();
    setLoading(true);
    const url = q
      ? `/api/artists/public?q=${encodeURIComponent(q)}`
      : '/api/artists/public';

    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setArtists(Array.isArray(data.artists) ? data.artists : []);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setArtists([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query]);

  const onSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) addRecentSearch(value.trim());
  };

  const trending = flattenDiscoverTracks(artists, 10);
  const searching = Boolean(query.trim());

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 pb-28 pt-8 sm:pt-10">
      {/* BeatStars-style hero: brand + one line + search as the job */}
      <section className="mb-10 border border-sd-border bg-sd-surface">
        <div className="border-b border-sd-border px-5 py-8 sm:px-8 sm:py-10">
          <p className="font-telemetry text-xs text-sd-status">[ ARTIST-OWNED · ED25519 ]</p>
          <h1 className="font-display mt-3 text-[clamp(2.75rem,9vw,5.5rem)] text-sd-text">
            Your next drop starts here
          </h1>
          <p className="text-pretty mt-4 max-w-2xl text-base leading-relaxed text-sd-muted">
            Browse signed releases. Play free. Support artists directly — SoundDrop is the space, not
            the middleman catalog.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          <label className="font-telemetry mb-3 block text-xs text-sd-muted" htmlFor="artist-search">
            [ SEARCH ARTISTS & SPACES ]
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              id="artist-search"
              type="search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Artist, slug, or key…"
              className="sd-input flex-1 text-base"
              autoComplete="off"
            />
            <Link href="/artist/setup" className="sd-btn shrink-0 sm:min-w-[11rem]">
              [ UPLOAD ]
            </Link>
          </div>
          {recentSearches.length > 0 && !query && (
            <div className="mt-4 flex flex-wrap gap-2">
              {recentSearches.slice(0, 6).map((s) => (
                <button key={s} type="button" onClick={() => onSearch(s)} className="sd-chip">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {!searching && !loading && <TrendingTracks tracks={trending} />}

      <div className="mb-4 flex items-end justify-between gap-4 border-b border-sd-border pb-3">
        <div>
          <p className="font-telemetry text-xs text-sd-muted">
            {searching ? '[ SEARCH RESULTS ]' : '[ ARTIST SPACES ]'}
          </p>
          <h2 className="font-display mt-2 text-2xl text-sd-text sm:text-3xl">
            {searching ? 'Matches' : 'Producers & artists'}
          </h2>
        </div>
        <p className="font-telemetry text-xs tabular-nums text-sd-muted">
          {loading ? '…' : `${artists.length.toString().padStart(2, '0')} SPACES`}
        </p>
      </div>

      {loading ? (
        <div
          className="grid gap-px bg-sd-border sm:grid-cols-2 lg:grid-cols-3"
          aria-busy="true"
          aria-label="Loading artists"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-sd-surface">
              <div className="sd-skeleton aspect-square w-full border-b border-sd-border" />
              <div className="space-y-3 p-4">
                <div className="sd-skeleton h-6 w-2/3" />
                <div className="sd-skeleton h-4 w-full" />
                <div className="sd-skeleton h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-px bg-sd-border sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => {
            const href = `/artist/${artist.slug || artist.publicKeyHash}`;
            return (
              <Link
                key={artist.slug || artist.publicKeyHash}
                href={href}
                data-artist-card
                className="group flex flex-col bg-sd-surface transition-colors duration-fast ease-out hover:bg-sd-surface-hover"
              >
                <div className="relative aspect-square w-full overflow-hidden border-b border-sd-border">
                  <Image
                    src={artist.profileImageUrl}
                    alt={artist.displayName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                    style={{ outline: '1px solid rgba(0,0,0,0.35)', outlineOffset: '-1px' }}
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-sd-bg/80 px-3 py-2 opacity-0 transition-opacity duration-fast ease-out group-hover:opacity-100">
                    <span className="font-telemetry text-[0.6875rem] text-sd-text">OPEN SPACE</span>
                    <span className="font-telemetry text-[0.6875rem] text-sd-accent">
                      {artist.tracks.length} TRK
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-display text-xl text-sd-text">{artist.displayName}</h3>
                  {artist.location ? (
                    <p className="mt-1 text-sm text-sd-muted">{artist.location}</p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-sd-muted">
                    {artist.bio}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-sd-border pt-3">
                    <p className="font-telemetry text-[0.6875rem] text-sd-muted">
                      {(artist.signedReleaseCount ?? artist.tracks.length)
                        .toString()
                        .padStart(2, '0')}{' '}
                      SIGNED
                    </p>
                    <p className="font-telemetry text-[0.6875rem] text-sd-status">
                      {artist.tracks.some((t) => t.isFree) ? 'FREE LISTENS' : 'PWYW'}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && artists.length === 0 && (
        <p className="font-telemetry mt-8 border border-sd-border p-6 text-xs text-sd-muted">
          [ NO MATCH — TRY ANOTHER QUERY ]
        </p>
      )}
    </main>
  );
}
