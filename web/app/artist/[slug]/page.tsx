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
    <main className="min-h-[100dvh] bg-sd-bg pb-36 sm:pb-40">
      <ArtistProfile artist={artist} />

      <section className="relative bg-sd-bg px-5 pt-12 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl border-t border-white/10 pt-10">
          <p className="font-telemetry text-[11px] tracking-widest text-sd-muted">[ ABOUT ]</p>
          <h2 className="font-display mt-3 text-2xl text-white sm:text-3xl">Bio</h2>
          <p className="text-pretty mt-5 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {artist.bio}
          </p>
        </div>
      </section>

      <ArtistTrackList
        tracks={artist.tracks}
        slug={artist.slug}
        publicKeyHash={artist.publicKeyHash}
        artistName={artist.displayName}
      />
    </main>
  );
}
