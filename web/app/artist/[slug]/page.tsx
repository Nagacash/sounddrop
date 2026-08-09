import { notFound } from 'next/navigation';
import { getPublicArtist } from '@/lib/publicCatalog';
import ArtistProfile from '@/components/ArtistProfile';
import ArtistTrackList from '@/components/ArtistTrackList';

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistSpacePage({ params }: Props) {
  const { slug } = await params;
  const artist = await getPublicArtist(slug);

  if (!artist) notFound();

  return (
    <main className="min-h-[100dvh] bg-sd-bg">
      <ArtistProfile artist={artist} />
      <ArtistTrackList
        tracks={artist.tracks}
        slug={artist.slug}
        publicKeyHash={artist.publicKeyHash}
        artistName={artist.displayName}
      />
    </main>
  );
}
