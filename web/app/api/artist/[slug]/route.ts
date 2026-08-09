import { NextResponse } from 'next/server';
import { getPublicArtist } from '@/lib/publicCatalog';

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const artist = await getPublicArtist(slug);
  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }
  return NextResponse.json({ artist });
}
