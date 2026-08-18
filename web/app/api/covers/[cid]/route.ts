import { NextResponse } from 'next/server';
import { isValidCid } from '@/lib/crypto';
import { readLocalCover } from '@/lib/coverStorage';

type Props = { params: Promise<{ cid: string }> };

/** Local/dev cover fallback when Supabase is unavailable. */
export async function GET(_req: Request, { params }: Props) {
  const { cid: raw } = await params;
  const cid = decodeURIComponent(raw);
  if (!isValidCid(cid)) {
    return NextResponse.json({ error: 'invalid cid' }, { status: 400 });
  }

  const buf = readLocalCover(cid);
  if (!buf) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
