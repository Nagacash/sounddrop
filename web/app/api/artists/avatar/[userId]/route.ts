import { NextResponse } from 'next/server';
import { readArtistAvatar } from '@/lib/avatarStorage';

type Props = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { userId: raw } = await params;
  const userId = decodeURIComponent(raw);
  if (!userId || userId.length > 200) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const hit = await readArtistAvatar(userId);
  if (!hit) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(hit.buffer), {
    status: 200,
    headers: {
      'Content-Type': hit.contentType,
      'Content-Length': String(hit.buffer.length),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
