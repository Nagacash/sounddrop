'use client';

import { notFound, useParams } from 'next/navigation';
import { getArtistByHash } from '@/lib/mockData';
import ArtistProfile from '@/components/ArtistProfile';
import ArtistTrackList from '@/components/ArtistTrackList';

export default function ArtistSpacePage() {
  const params = useParams();
  const publicKeyHash = typeof params.publicKeyHash === 'string' ? params.publicKeyHash : '';
  const artist = getArtistByHash(publicKeyHash);

  if (!artist) notFound();

  return (
    <main className="min-h-[100dvh] bg-sd-bg">
      <ArtistProfile artist={artist} />
      <ArtistTrackList
        tracks={artist.tracks}
        publicKeyHash={artist.publicKeyHash}
        artistName={artist.displayName}
      />
    </main>
  );
}
