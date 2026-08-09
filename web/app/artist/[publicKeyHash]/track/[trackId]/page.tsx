'use client';

import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { getArtistByHash, getTrackByArtistAndId } from '@/lib/mockData';
import MusicPlayer from '@/components/MusicPlayer';
import ShareButton from '@/components/ShareButton';

export default function TrackPage() {
  const params = useParams();
  const publicKeyHash = typeof params.publicKeyHash === 'string' ? params.publicKeyHash : '';
  const trackId = typeof params.trackId === 'string' ? params.trackId : '';
  const artist = getArtistByHash(publicKeyHash);
  const track = getTrackByArtistAndId(publicKeyHash, trackId);

  if (!artist || !track) notFound();

  return (
    <main className="min-h-[100dvh] bg-sd-bg px-5 pb-28 pt-14 sm:px-8">
      <div className="mx-auto max-w-xl">
        <Link
          href={`/artist/${publicKeyHash}`}
          className="mb-8 inline-flex min-h-11 items-center text-sm text-sd-muted transition-colors duration-fast hover:text-sd-text"
        >
          ← {artist.displayName}
        </Link>
        <MusicPlayer
          track={track}
          artistName={artist.displayName}
          publicKeyHash={publicKeyHash}
        />
        <div className="mt-4">
          <ShareButton
            trackId={track.id}
            publicKeyHash={publicKeyHash}
            title={track.title}
            artistName={artist.displayName}
          />
        </div>
      </div>
    </main>
  );
}
