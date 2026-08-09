'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUIStore } from '@/stores/uiStore';
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

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10">
      <section className="sd-panel relative mb-10 overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border-b border-sd-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <p className="font-telemetry mb-4 text-[11px] text-sd-muted">
              UNIT / SD-01 · REV 0.9 · ED25519
            </p>
            <h1 className="font-display text-[clamp(3rem,10vw,7rem)] text-sd-text">
              SOUND
              <br />
              DROP
            </h1>
            <hr className="sd-rule my-6 max-w-[8rem]" />
            <p className="text-pretty max-w-xl text-sm text-sd-muted sm:text-base">
              Artist-owned sound. Cryptographically verified. Each artist has a space — not a feed.
            </p>
            <Link href="/artist/setup" className="sd-btn mt-8">
              [ UPLOAD YOUR MUSIC ]
            </Link>
          </div>
          <aside className="font-telemetry flex flex-col justify-between gap-6 p-6 text-[11px] text-sd-muted sm:p-8">
            <div>
              <p className="mb-2 text-sd-status">[ SYSTEM ONLINE ]</p>
              <p>SIGN → HASH → VERIFY → STORE</p>
              <p className="mt-2">PRIVATE KEY NEVER LEAVES BROWSER</p>
            </div>
            <dl className="grid grid-cols-2 gap-px bg-sd-border">
              <div className="bg-sd-surface p-3">
                <dt className="text-[10px]">ARTISTS</dt>
                <dd className="mt-1 text-lg text-sd-text">
                  {loading ? '—' : artists.length.toString().padStart(2, '0')}
                </dd>
              </div>
              <div className="bg-sd-surface p-3">
                <dt className="text-[10px]">PROTOCOL</dt>
                <dd className="mt-1 text-lg text-sd-text">CID</dd>
              </div>
              <div className="bg-sd-surface p-3">
                <dt className="text-[10px]">SIG</dt>
                <dd className="mt-1 text-lg text-sd-text">ED25519</dd>
              </div>
              <div className="bg-sd-surface p-3">
                <dt className="text-[10px]">CUSTODY</dt>
                <dd className="mt-1 text-lg text-sd-accent">NONE</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <div className="mb-8 border-b border-sd-border pb-6">
        <label className="font-telemetry mb-2 block text-[10px] text-sd-muted" htmlFor="artist-search">
          [ SEARCH / INDEX ]
        </label>
        <input
          id="artist-search"
          type="search"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search artists by name…"
          className="sd-input max-w-xl"
        />
        {recentSearches.length > 0 && !query && (
          <div className="mt-3 flex flex-wrap gap-2">
            {recentSearches.slice(0, 5).map((s) => (
              <button key={s} type="button" onClick={() => onSearch(s)} className="sd-chip">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="font-telemetry mb-4 text-[11px] text-sd-muted">
        {query.trim() ? '[ SEARCH RESULTS ]' : '[ FEATURED ARTISTS ]'}
      </h2>
      <div className="grid gap-px bg-sd-border sm:grid-cols-2 lg:grid-cols-3">
        {artists.map((artist) => (
          <Link
            key={artist.slug || artist.publicKeyHash}
            href={`/artist/${artist.slug || artist.publicKeyHash}`}
            data-artist-card
            className="group bg-sd-surface transition-colors duration-fast ease-out hover:bg-[#161616]"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-sd-border">
              <Image
                src={artist.profileImageUrl}
                alt={artist.displayName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
                unoptimized
                style={{ outline: '1px solid rgba(0,0,0,0.35)', outlineOffset: '-1px' }}
              />
            </div>
            <div className="p-4">
              <h3 className="font-display text-xl text-sd-text">{artist.displayName}</h3>
              <p className="mt-2 line-clamp-2 text-sm text-sd-muted">{artist.bio}</p>
              <p className="font-telemetry mt-3 text-[10px] text-sd-muted">
                {artist.tracks.length.toString().padStart(2, '0')} TRK ·{' '}
                {artist.followerCount.toLocaleString()} FOL
              </p>
            </div>
          </Link>
        ))}
      </div>
      {!loading && artists.length === 0 && (
        <p className="font-telemetry mt-8 border border-sd-border p-6 text-[11px] text-sd-muted">
          [ NO MATCH ]
        </p>
      )}
      {loading && (
        <p className="font-telemetry mt-8 text-[11px] text-sd-muted">[ INDEXING… ]</p>
      )}
    </main>
  );
}
