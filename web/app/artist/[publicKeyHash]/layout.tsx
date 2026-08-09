import type { Metadata } from 'next';
import { getPublicArtist } from '@/lib/publicCatalog';
import { artistShareUrl } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  params: Promise<{ publicKeyHash: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicKeyHash } = await params;
  const artist = await getPublicArtist(publicKeyHash);
  if (!artist) return { title: 'Artist — SoundDrop' };

  const url = artistShareUrl(
    publicKeyHash,
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  );

  return {
    title: `${artist.displayName} | SoundDrop`,
    description: artist.bio,
    openGraph: {
      title: `${artist.displayName} on SoundDrop`,
      description: `${artist.bio} Artist-owned, cryptographically verified.`,
      url,
      images: [{ url: artist.profileImageUrl, width: 1200, height: 630 }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artist.displayName} on SoundDrop`,
      description: artist.bio,
      images: [artist.profileImageUrl],
    },
    alternates: { canonical: url },
  };
}

export default function ArtistSpaceLayout({ children }: Props) {
  return children;
}
