import { NextResponse } from 'next/server';
import { isValidCid } from '@/lib/crypto';
import { readCover } from '@/lib/coverStorage';

type Props = { params: Promise<{ cid: string }> };

/** Serve track cover JPEG (Neon-backed, local fallback). */
export async function GET(_req: Request, { params }: Props) {
  const { cid: raw } = await params;
  const cid = decodeURIComponent(raw);
  if (!isValidCid(cid)) {
    return NextResponse.json({ error: 'invalid cid' }, { status: 400 });
  }

  const hit = await readCover(cid);
  if (!hit) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(hit.buffer), {
    status: 200,
    headers: {
      'Content-Type': hit.contentType || 'image/jpeg',
      'Content-Length': String(hit.buffer.length),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
