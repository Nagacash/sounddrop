import { NextResponse } from 'next/server';
import { getPublicArtist } from '@/lib/publicCatalog';

type Props = { params: Promise<{ publicKeyHash: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { publicKeyHash } = await params;
  const artist = await getPublicArtist(publicKeyHash);
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }
  return NextResponse.json({ tracks: artist.tracks });
}
