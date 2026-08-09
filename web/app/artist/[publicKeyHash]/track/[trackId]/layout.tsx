import type { Metadata } from 'next';
import { getArtistByHash, getTrackByArtistAndId } from '@/lib/mockData';
import { formatPriceCents, trackShareUrl } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  params: Promise<{ publicKeyHash: string; trackId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicKeyHash, trackId } = await params;
  const artist = getArtistByHash(publicKeyHash);
  const track = getTrackByArtistAndId(publicKeyHash, trackId);
  if (!artist || !track) return { title: 'Track — SoundDrop' };

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const url = trackShareUrl(publicKeyHash, trackId, origin);
  const priceDesc = track.isFree
    ? 'Free download'
    : `From ${formatPriceCents(track.minPriceCents ?? 0)}`;

  return {
    title: `${track.title} — ${artist.displayName} | SoundDrop`,
    description: `Listen to ${track.title} by ${artist.displayName} on SoundDrop. ${priceDesc}.`,
    openGraph: {
      title: `${track.title} by ${artist.displayName}`,
      description: `${priceDesc} on SoundDrop — artist-owned music.`,
      url,
      images: [{ url: artist.profileImageUrl, width: 1200, height: 630 }],
      type: 'music.song',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${track.title} by ${artist.displayName}`,
      description: 'On SoundDrop — artist-owned music',
      images: [artist.profileImageUrl],
    },
    alternates: { canonical: url },
  };
}

export default function TrackLayout({ children }: Props) {
  return children;
}
