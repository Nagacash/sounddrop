import { notFound } from 'next/navigation';
import { getPublicArtist } from '@/lib/publicCatalog';
import ArtistProfile from '@/components/ArtistProfile';
import ArtistTrackList from '@/components/ArtistTrackList';

type Props = { params: Promise<{ publicKeyHash: string }> };

export default async function ArtistSpacePage({ params }: Props) {
  const { publicKeyHash } = await params;
  const artist = await getPublicArtist(publicKeyHash);

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
