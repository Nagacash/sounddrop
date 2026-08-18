'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUIStore } from '@/stores/uiStore';
import TrendingTracks, { flattenDiscoverTracks } from '@/components/TrendingTracks';
import ArtistAvatar from '@/components/ArtistAvatar';
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
      <section className="mb-10 border border-sd-border bg-sd-surface">
        <div className="border-b border-sd-border px-5 py-8 sm:px-8 sm:py-10">
          <p className="font-telemetry text-xs text-sd-status">[ ARTIST-OWNED · ED25519 ]</p>
          <h1 className="font-display mt-3 text-[clamp(2.75rem,9vw,5.5rem)] text-sd-text">
            SoundDrop
          </h1>
          <p className="text-pretty mt-4 max-w-2xl text-base leading-relaxed text-sd-muted">
            Publish MP3s signed with Ed25519 keys kept in your browser. Listeners stream and download
            from your public space. No middleman catalog.
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

      {!searching && (
        <section className="mb-12 border border-sd-border bg-sd-surface px-5 py-8 sm:px-8">
          <p className="font-telemetry text-xs text-sd-muted">[ START HERE ]</p>
          <h2 className="font-display mt-2 text-2xl text-sd-text sm:text-3xl">
            First upload, step by step
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sd-muted">
            SoundDrop uses Ed25519 keys. Your private key never leaves this browser. The server only
            gets your public key, so anyone can check that a release came from you.
          </p>

          <ol className="mt-8 space-y-6 border-t border-sd-border pt-8">
            <li className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:gap-4">
              <span className="font-telemetry text-xs tabular-nums text-sd-accent">01</span>
              <div>
                <p className="text-sm font-semibold text-sd-text">Sign in and open the dashboard</p>
                <p className="mt-1 text-sm leading-relaxed text-sd-muted">
                  Hit Upload above (or Open dashboard below). Accept the content policy once. You are
                  responsible for what you publish.
                </p>
              </div>
            </li>
            <li className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:gap-4">
              <span className="font-telemetry text-xs tabular-nums text-sd-accent">02</span>
              <div>
                <p className="text-sm font-semibold text-sd-text">Create your keypair</p>
                <p className="mt-1 text-sm leading-relaxed text-sd-muted">
                  The dashboard generates an Ed25519 keypair in your browser and stores the private
                  key in local storage. Register the public key so your artist space is tied to that
                  key. If you clear site data, you lose the private key, so keep a backup if you care
                  about the same identity later.
                </p>
              </div>
            </li>
            <li className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:gap-4">
              <span className="font-telemetry text-xs tabular-nums text-sd-accent">03</span>
              <div>
                <p className="text-sm font-semibold text-sd-text">Pick an MP3 and sign the release</p>
                <p className="mt-1 text-sm leading-relaxed text-sd-muted">
                  Add a title, optional producers and featuring credits, and a track thumbnail if you
                  want one. On upload we hash the file (CID), sign the metadata with your private
                  key, then store the audio. The signature travels with the track so listeners can
                  see it as a signed release.
                </p>
              </div>
            </li>
            <li className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:gap-4">
              <span className="font-telemetry text-xs tabular-nums text-sd-accent">04</span>
              <div>
                <p className="text-sm font-semibold text-sd-text">Share your space</p>
                <p className="mt-1 text-sm leading-relaxed text-sd-muted">
                  You get a public page at /artist/your-slug. People can stream in the browser and
                  download the MP3. SoundDrop hosts the page and the file. It does not own the music
                  or replace your Bandcamp or Spotify links. You can still put those on your profile.
                </p>
              </div>
            </li>
          </ol>

          <div className="mt-8 border-t border-sd-border pt-6">
            <p className="font-telemetry text-xs text-sd-accent">FOR LISTENERS</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sd-muted">
              Search an artist, open their space, play tracks, download when you want the file.
              Signed means the upload was checked against that artist&apos;s public key. No account
              needed to listen.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-sd-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-sd-muted">
              That is the whole loop: key in browser, sign the drop, share the link.
            </p>
            <Link href="/artist/setup" className="sd-btn shrink-0">
              [ OPEN DASHBOARD ]
            </Link>
          </div>
        </section>
      )}

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
            <div key={i} className="flex gap-4 bg-sd-surface p-4">
              <div className="sd-skeleton sd-avatar h-16 w-16 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="sd-skeleton h-5 w-2/3" />
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
                className="group flex gap-4 bg-sd-surface p-4 transition-colors duration-fast ease-out hover:bg-sd-surface-hover"
              >
                <ArtistAvatar
                  src={artist.profileImageUrl}
                  name={artist.displayName}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-display truncate text-xl text-sd-text">{artist.displayName}</h3>
                  {artist.location ? (
                    <p className="mt-0.5 truncate text-sm text-sd-muted">{artist.location}</p>
                  ) : null}
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-sd-muted">
                    {artist.bio}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="font-telemetry text-[0.6875rem] text-sd-muted">
                      {(artist.signedReleaseCount ?? artist.tracks.length)
                        .toString()
                        .padStart(2, '0')}{' '}
                      SIGNED · {artist.tracks.length.toString().padStart(2, '0')} TRK
                    </p>
                    <span className="font-telemetry text-[0.6875rem] text-sd-accent opacity-0 transition-opacity duration-fast group-hover:opacity-100">
                      OPEN →
                    </span>
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

      <footer className="mt-16 border-t border-sd-border pt-8 pb-4">
        <p className="font-telemetry text-[0.6875rem] text-sd-muted">
          <Link
            href="/privacy"
            className="transition-colors duration-fast hover:text-sd-text"
          >
            Privacy
          </Link>
        </p>
      </footer>
    </main>
  );
}
