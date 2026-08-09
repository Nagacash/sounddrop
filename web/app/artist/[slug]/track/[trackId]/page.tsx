import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicTrack } from '@/lib/publicCatalog';
import MusicPlayer from '@/components/MusicPlayer';
import ShareButton from '@/components/ShareButton';

type Props = { params: Promise<{ slug: string; trackId: string }> };

export default async function TrackPage({ params }: Props) {
  const { slug, trackId } = await params;
  const hit = await getPublicTrack(slug, trackId);
  if (!hit) notFound();

  const { artist, track } = hit;

  return (
    <main className="min-h-[100dvh] bg-sd-bg px-5 pb-28 pt-14 sm:px-8">
      <div className="mx-auto max-w-xl">
        <Link
          href={`/artist/${artist.slug}`}
          className="mb-8 inline-flex min-h-11 items-center text-sm text-sd-muted transition-colors duration-fast hover:text-sd-text"
        >
          ← {artist.displayName}
        </Link>
        <MusicPlayer
          track={track}
          artistName={artist.displayName}
          publicKeyHash={artist.publicKeyHash}
        />
        <div className="mt-4">
          <ShareButton
            trackId={track.id}
            publicKeyHash={artist.slug}
            title={track.title}
            artistName={artist.displayName}
          />
        </div>
      </div>
    </main>
  );
}
