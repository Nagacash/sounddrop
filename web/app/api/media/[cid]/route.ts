import { NextRequest, NextResponse } from 'next/server';
import { isValidCid } from '@/lib/crypto';
import { readAudio } from '@/lib/audioStorage';

type Props = { params: Promise<{ cid: string }> };

export async function GET(req: NextRequest, { params }: Props) {
  const { cid: raw } = await params;
  const cid = decodeURIComponent(raw);

  if (!isValidCid(cid)) {
    return NextResponse.json({ error: 'invalid cid' }, { status: 400 });
  }

  const buf = await readAudio(cid);
  if (!buf) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const size = buf.length;
  const range = req.headers.get('range');

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? parseInt(m[1], 10) : 0;
      const end = m[2] ? parseInt(m[2], 10) : size - 1;
      if (start >= size || end >= size || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${size}` },
        });
      }
      const chunk = buf.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': String(chunk.length),
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
