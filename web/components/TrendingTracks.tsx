'use client';

import Link from 'next/link';
import { usePlayerStore } from '@/stores/playerStore';
import ArtistAvatar, { BeatArtPlaceholder } from '@/components/ArtistAvatar';
import type { Artist, Track } from '@/stores/artistStore';

export type DiscoverTrack = Track & {
  artistName: string;
  artistSlug: string;
  publicKeyHash: string;
  profileImageUrl: string;
};

export function flattenDiscoverTracks(artists: Artist[], limit = 12): DiscoverTrack[] {
  const rows: DiscoverTrack[] = [];
  for (const artist of artists) {
    for (const track of artist.tracks) {
      rows.push({
        ...track,
        artistName: artist.displayName,
        artistSlug: artist.slug || artist.publicKeyHash,
        publicKeyHash: artist.publicKeyHash,
        profileImageUrl: artist.profileImageUrl,
      });
    }
  }
  rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return rows.slice(0, limit);
}

interface TrendingTracksProps {
  tracks: DiscoverTrack[];
}

export default function TrendingTracks({ tracks }: TrendingTracksProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayerStore();

  if (!tracks.length) return null;

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-sd-border pb-3">
        <div>
          <p className="font-telemetry text-xs text-sd-muted">[ TRENDING TRACKS ]</p>
          <h2 className="font-display mt-2 text-2xl text-sd-text sm:text-3xl">New & notable</h2>
        </div>
        <p className="font-telemetry text-xs text-sd-muted">{tracks.length} DROPS</p>
      </div>

      <div className="border border-sd-border bg-sd-border">
        {tracks.map((track, index) => {
          const active = currentTrack?.id === track.id;
          const playing = active && isPlaying;

          return (
            <div
              key={`${track.artistSlug}-${track.id}`}
              className={`group grid grid-cols-[44px_48px_1fr_auto] items-center gap-3 border-b border-sd-border bg-sd-surface px-3 py-2.5 last:border-b-0 transition-colors duration-fast ease-out hover:bg-sd-surface-hover sm:grid-cols-[48px_56px_1fr_auto_auto] sm:gap-4 sm:px-4 ${
                active ? 'bg-sd-surface-hover' : ''
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  playTrack({
                    ...track,
                    artistName: track.artistName,
                    publicKeyHash: track.publicKeyHash,
                  })
                }
                className="flex h-11 w-11 cursor-pointer items-center justify-center text-sm text-sd-muted transition-colors duration-fast hover:text-sd-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {playing ? (
                  <span className="text-sd-accent">
                    <PauseIcon />
                  </span>
                ) : (
                  <>
                    <span className="tabular-nums group-hover:hidden">{index + 1}</span>
                    <span className="hidden text-sd-accent group-hover:inline">
                      <PlayIcon />
                    </span>
                  </>
                )}
              </button>

              <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                <BeatArtPlaceholder title={track.title} />
              </div>

              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    playTrack({
                      ...track,
                      artistName: track.artistName,
                      publicKeyHash: track.publicKeyHash,
                    })
                  }
                  className="block w-full cursor-pointer truncate text-left text-sm font-semibold sm:text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sd-accent"
                >
                  <span className={active ? 'text-sd-accent' : 'text-sd-text'}>{track.title}</span>
                </button>
                <p className="mt-0.5 flex min-w-0 items-center gap-2 truncate text-sm text-sd-muted">
                  <ArtistAvatar
                    src={track.profileImageUrl}
                    name={track.artistName}
                    size="xs"
                  />
                  <Link
                    href={`/artist/${track.artistSlug}`}
                    className="truncate transition-colors duration-fast hover:text-sd-text"
                  >
                    {track.artistName}
                  </Link>
                  {track.producers ? (
                    <span className="hidden truncate sm:inline"> · prod. {track.producers}</span>
                  ) : null}
                </p>
              </div>

              <span className="hidden font-telemetry text-[0.6875rem] text-sd-status sm:inline">
                {track.isFree ? 'FREE' : 'PWYW'}
              </span>

              <Link
                href={`/artist/${track.artistSlug}`}
                className="font-telemetry hidden min-h-11 items-center text-[0.6875rem] text-sd-muted transition-colors duration-fast hover:text-sd-text sm:inline-flex"
              >
                SPACE →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
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
