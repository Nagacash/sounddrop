import { NextResponse } from 'next/server';
import { getArtistByHash } from '@/lib/mockData';

type Props = { params: Promise<{ publicKeyHash: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { publicKeyHash } = await params;
  const artist = getArtistByHash(publicKeyHash);
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }
  return NextResponse.json({ tracks: artist.tracks });
}
