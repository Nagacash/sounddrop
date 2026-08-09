import { NextRequest, NextResponse } from 'next/server';
import { listPublicArtists } from '@/lib/publicCatalog';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || '';
  const artists = await listPublicArtists(q);
  return NextResponse.json({ artists });
}
